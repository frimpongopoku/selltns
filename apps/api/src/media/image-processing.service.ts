import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import {
  DISPLAY_MAX_DIMENSION,
  DISPLAY_QUALITY,
  THUMB_MAX_DIMENSION,
  THUMB_QUALITY,
} from './media.constants';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

export interface ProcessedImageSet {
  display: ProcessedImage;
  thumb: ProcessedImage;
}

@Injectable()
export class ImageProcessingService {
  async process(input: Buffer): Promise<ProcessedImageSet> {
    // `.rotate()` with no args auto-orients from EXIF, then the pipeline
    // strips metadata by default (sharp doesn't copy EXIF/ICC unless asked),
    // which is what we want: no GPS/device data leaking to a public CDN URL.
    const source = sharp(input).rotate();

    const [display, thumb] = await Promise.all([
      this.render(source.clone(), DISPLAY_MAX_DIMENSION, DISPLAY_QUALITY),
      this.render(source.clone(), THUMB_MAX_DIMENSION, THUMB_QUALITY),
    ]);

    return { display, thumb };
  }

  private async render(
    pipeline: sharp.Sharp,
    maxDimension: number,
    quality: number,
  ): Promise<ProcessedImage> {
    const buffer = await pipeline
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
    const { width, height } = await sharp(buffer).metadata();
    return { buffer, width: width ?? 0, height: height ?? 0 };
  }
}
