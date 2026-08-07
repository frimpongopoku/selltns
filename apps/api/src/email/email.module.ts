import { Logger, Module } from '@nestjs/common';
import { EMAIL_SERVICE } from './email.service';
import { BrevoEmailService } from './brevo-email.service';
import { ConsoleEmailService } from './console-email.service';

const logger = new Logger('EmailModule');

@Module({
  providers: [
    {
      provide: EMAIL_SERVICE,
      useFactory: () => {
        if (process.env.BREVO_API_KEY) {
          logger.log('Using Brevo for transactional email.');
          return new BrevoEmailService();
        }
        logger.warn(
          'BREVO_API_KEY not set — falling back to writing emails to disk ' +
            '(apps/api/emails-sent/). Fine for local dev, must not run in production.',
        );
        return new ConsoleEmailService();
      },
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
