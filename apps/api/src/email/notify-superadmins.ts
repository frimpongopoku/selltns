import type { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { EmailService } from './email.service';

// Fire-and-forget: a failed notification must never fail the vendor's
// submission, so errors are logged rather than thrown.
export async function notifySuperAdmins(
  prisma: PrismaService,
  emailService: EmailService,
  logger: Logger,
  email: { subject: string; html: string; text: string },
): Promise<void> {
  try {
    const admins = await prisma.superAdmin.findMany({ select: { email: true } });
    if (admins.length === 0) {
      logger.warn(`No superadmins to notify for "${email.subject}"`);
      return;
    }
    await Promise.all(
      admins.map((admin) =>
        emailService.send({ to: admin.email, ...email }).catch((err) => {
          logger.error(`Failed to notify superadmin ${admin.email}: ${err}`);
        }),
      ),
    );
  } catch (err) {
    logger.error(`Failed to notify superadmins: ${err}`);
  }
}
