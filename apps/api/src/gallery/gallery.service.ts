import { Injectable } from '@nestjs/common';
import { gallery as seedGallery } from '../common/seed-data';
import { MediaAsset } from '../common/types';

@Injectable()
export class GalleryService {
  private assets: MediaAsset[] = [...seedGallery];

  findAll(): MediaAsset[] {
    return this.assets;
  }

  create(input: Partial<MediaAsset>): MediaAsset {
    const asset: MediaAsset = {
      id: `media_${Date.now()}`,
      tenantId: 'tenant_demo',
      url: input.url ?? 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200',
      thumbUrl: input.thumbUrl ?? input.url ?? '',
      altText: input.altText ?? '',
      uploadedAt: new Date().toISOString(),
    };
    this.assets = [asset, ...this.assets];
    return asset;
  }

  remove(id: string): { id: string } {
    this.assets = this.assets.filter((a) => a.id !== id);
    return { id };
  }
}
