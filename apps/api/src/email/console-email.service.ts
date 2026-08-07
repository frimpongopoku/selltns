import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EmailMessage, EmailService } from './email.service';

const LOG_DIR = join(process.cwd(), 'emails-sent');

// Dev-only stand-in for a real provider so the full order -> email flow runs
// end to end without live credentials. Never selected when BREVO_API_KEY is
// set — see email.module.ts. Writes each email to a file instead of an
// inbox so its content can actually be inspected during local testing.
@Injectable()
export class ConsoleEmailService implements EmailService {
  private readonly logger = new Logger('ConsoleEmailService');

  async send(message: EmailMessage): Promise<void> {
    const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    this.logger.log(`Email to ${to}: "${message.subject}"`);

    await mkdir(LOG_DIR, { recursive: true });
    const safeTo = to.replace(/[^a-z0-9]/gi, '_').slice(0, 60);
    const filename = `${Date.now()}-${safeTo}.html`;
    await writeFile(
      join(LOG_DIR, filename),
      `<!-- To: ${to} -->\n<!-- Subject: ${message.subject} -->\n${message.html}`,
    );
  }
}
