import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailService } from './email.service';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

// Brevo (formerly Sendinblue) — 300 emails/day free forever, plain REST API
// so no SDK dependency is needed for something this simple.
@Injectable()
export class BrevoEmailService implements EmailService {
  private readonly logger = new Logger('BrevoEmailService');
  private readonly apiKey = process.env.BREVO_API_KEY as string;
  private readonly fromEmail =
    process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@selltns.dev';
  private readonly fromName = process.env.EMAIL_FROM_NAME ?? 'Selltns';

  async send(message: EmailMessage): Promise<void> {
    const recipients = (
      Array.isArray(message.to) ? message.to : [message.to]
    ).map((email) => ({
      email,
    }));

    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: this.fromEmail, name: this.fromName },
        to: recipients,
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Brevo send failed (${res.status}): ${body}`);
      throw new Error(`Failed to send email via Brevo (${res.status})`);
    }
  }
}
