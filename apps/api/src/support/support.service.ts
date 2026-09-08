import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service';

export type SupportMessageAudience = 'platform' | 'biibisoft';

export interface SubmitSupportMessageInput {
  name: string;
  email: string;
  message: string;
  pageUrl?: string;
  tenantId?: string;
  // "platform" (default) = the site's Help/Support form; "biibisoft" = the
  // storefront footer's "Contact the Biibisoft team" entry point.
  audience?: SupportMessageAudience;
  // Anti-spam: a hidden field real users never fill, and a minimum
  // time-on-page a bot submitting instantly won't have waited out.
  honeypot?: string;
  formRenderedAt?: number;
}

const MIN_FILL_TIME_MS = 2000;

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private readonly notifyEmail = process.env.PLATFORM_SUPPORT_EMAIL;
  private readonly biibisoftEmail =
    process.env.BIIBISOFT_CONTACT_EMAIL ?? 'hello@biibisoft.com';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  async submit(input: SubmitSupportMessageInput): Promise<{ id: string }> {
    if (input.honeypot) {
      // Silently accept-and-drop — telling a bot it was caught just
      // teaches it to leave the honeypot field blank next time.
      return { id: 'ok' };
    }
    if (
      input.formRenderedAt &&
      Date.now() - input.formRenderedAt < MIN_FILL_TIME_MS
    ) {
      throw new BadRequestException('Please try again.');
    }

    const name = input.name.trim();
    const email = input.email.trim();
    const message = input.message.trim();
    if (!name || !email || !message) {
      throw new BadRequestException('Name, email, and message are required.');
    }

    const audience: SupportMessageAudience =
      input.audience === 'biibisoft' ? 'biibisoft' : 'platform';

    const saved = await this.prisma.supportMessage.create({
      data: {
        name,
        email,
        message,
        pageUrl: input.pageUrl ?? '',
        tenantId: input.tenantId,
        audience,
      },
    });

    const notifyEmail =
      audience === 'biibisoft' ? this.biibisoftEmail : this.notifyEmail;
    const subject =
      audience === 'biibisoft'
        ? `Message to Biibisoft from ${name}`
        : `Support message from ${name}`;

    if (notifyEmail) {
      await this.emailService
        .send({
          to: notifyEmail,
          subject,
          html: `
            <p><strong>From:</strong> ${name} (${email})</p>
            ${input.pageUrl ? `<p><strong>Page:</strong> ${input.pageUrl}</p>` : ''}
            ${input.tenantId ? `<p><strong>Tenant ID:</strong> ${input.tenantId}</p>` : ''}
            <p style="white-space: pre-wrap;">${message}</p>
          `,
          text: `From: ${name} (${email})\n${input.pageUrl ? `Page: ${input.pageUrl}\n` : ''}${input.tenantId ? `Tenant ID: ${input.tenantId}\n` : ''}\n${message}`,
        })
        .catch((err) => {
          // The message is already persisted — a failed notification
          // shouldn't fail the whole request, just get logged for follow-up.
          this.logger.error(`Failed to send support notification email: ${err}`);
        });
    } else {
      this.logger.warn(
        `${audience === 'biibisoft' ? 'BIIBISOFT_CONTACT_EMAIL' : 'PLATFORM_SUPPORT_EMAIL'} not set — support message saved but no notification sent.`,
      );
    }

    return { id: saved.id };
  }
}
