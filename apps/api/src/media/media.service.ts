import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ImageProcessingService } from './image-processing.service';
import {
  STORAGE_SERVICE,
  type StorageService,
} from './storage/storage.service';
import { ALLOWED_MIME_TYPES } from './media.constants';
import type { MediaAsset } from '@prisma/client';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imaging: ImageProcessingService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  findAll(tenantId: string): Promise<MediaAsset[]> {
    return this.prisma.mediaAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    tenantId: string,
    file: Express.Multer.File | undefined,
    altText?: string,
  ): Promise<MediaAsset> {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!file) throw new BadRequestException('No file provided');
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        'Unsupported file type — upload a JPEG, PNG, WebP or GIF image.',
      );
    }

    const { display, thumb } = await this.imaging
      .process(file.buffer)
      .catch(() => {
        throw new BadRequestException(
          "Couldn't read that file — is it a valid image?",
        );
      });

    const id = randomUUID();
    const key = `tenants/${tenantId}/media/${id}/original.webp`;
    const thumbKey = `tenants/${tenantId}/media/${id}/thumb.webp`;

    await Promise.all([
      this.storage.putObject(key, display.buffer, 'image/webp'),
      this.storage.putObject(thumbKey, thumb.buffer, 'image/webp'),
    ]);

    return this.prisma.mediaAsset.create({
      data: {
        id,
        tenantId,
        key,
        url: this.storage.publicUrl(key),
        thumbKey,
        thumbUrl: this.storage.publicUrl(thumbKey),
        width: display.width,
        height: display.height,
        bytes: display.buffer.length,
        altText: altText ?? '',
      },
    });
  }

  async remove(id: string, tenantId: string): Promise<{ id: string }> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, tenantId },
    });
    if (!asset) throw new NotFoundException(`Media ${id} not found`);

    await Promise.all([
      this.storage.deleteObject(asset.key),
      this.storage.deleteObject(asset.thumbKey),
    ]);
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
    return { id: asset.id };
  }
}
