import { Logger, Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ImageProcessingService } from './image-processing.service';
import { STORAGE_SERVICE } from './storage/storage.service';
import { R2StorageService } from './storage/r2-storage.service';
import { LocalDiskStorageService } from './storage/local-disk-storage.service';

const logger = new Logger('MediaModule');

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    ImageProcessingService,
    {
      provide: STORAGE_SERVICE,
      useFactory: () => {
        const hasR2Config =
          process.env.R2_ACCOUNT_ID &&
          process.env.R2_ACCESS_KEY_ID &&
          process.env.R2_SECRET_ACCESS_KEY &&
          process.env.R2_BUCKET_NAME &&
          process.env.R2_PUBLIC_BASE_URL;

        if (hasR2Config) {
          logger.log('Using Cloudflare R2 for media storage.');
          return new R2StorageService();
        }

        logger.warn(
          'R2 environment variables not set — falling back to local disk storage ' +
            '(apps/api/uploads/). This is fine for local dev but must not run in production.',
        );
        return new LocalDiskStorageService();
      },
    },
  ],
})
export class MediaModule {}
