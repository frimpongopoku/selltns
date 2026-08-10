import { Logger, Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { ImageProcessingService } from '../media/image-processing.service';
import { PRIVATE_STORAGE_SERVICE } from '../media/storage/private-storage.service';
import { R2PrivateStorageService } from '../media/storage/r2-private-storage.service';
import { LocalDiskPrivateStorageService } from '../media/storage/local-disk-private-storage.service';

const logger = new Logger('VerificationModule');

@Module({
  controllers: [VerificationController],
  providers: [
    VerificationService,
    ImageProcessingService,
    {
      provide: PRIVATE_STORAGE_SERVICE,
      useFactory: () => {
        const hasR2Config =
          process.env.R2_ACCOUNT_ID &&
          process.env.R2_ACCESS_KEY_ID &&
          process.env.R2_SECRET_ACCESS_KEY &&
          process.env.R2_PRIVATE_BUCKET_NAME;

        if (hasR2Config) {
          logger.log('Using a private Cloudflare R2 bucket for verification documents.');
          return new R2PrivateStorageService();
        }

        logger.warn(
          'R2_PRIVATE_BUCKET_NAME not set — falling back to local disk storage ' +
            '(apps/api/private-uploads/). This is fine for local dev but must not run in production.',
        );
        return new LocalDiskPrivateStorageService();
      },
    },
  ],
  // PRIVATE_STORAGE_SERVICE is also needed by SuperAdminModule (to stream
  // the submitted photos back out for review) — exported rather than
  // duplicating the same provider factory there.
  exports: [PRIVATE_STORAGE_SERVICE],
})
export class VerificationModule {}
