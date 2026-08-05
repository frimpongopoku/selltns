import { Injectable, NotFoundException } from '@nestjs/common';
import { gallery as seedGallery } from '../common/seed-data';
import { MediaAsset } from '../common/types';

@Injectable()
export class GalleryService {
  private assets: MediaAsset[] = [...seedGallery];

  findAll(tenantId: string): MediaAsset[] {
    return this.assets.filter((a) => a.tenantId === tenantId);
  }

  create(input: Partial<MediaAsset> & { tenantId: string }): MediaAsset {
    const asset: MediaAsset = {
      id: `media_${Date.now()}`,
      tenantId: input.tenantId,
      url: input.url ?? 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200',
      thumbUrl: input.thumbUrl ?? input.url ?? '',
      altText: input.altText ?? '',
      uploadedAt: new Date().toISOString(),
    };
    this.assets = [asset, ...this.assets];
    return asset;
  }

  remove(id: string, tenantId: string): { id: string } {
    const existing = this.assets.find((a) => a.id === id && a.tenantId === tenantId);
    if (!existing) throw new NotFoundException(`Media ${id} not found`);
    this.assets = this.assets.filter((a) => a.id !== existing.id);
    return { id: existing.id };
  }
}
