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
  // Suggested focus point (% from left/top), or null when the photo's shape
  // already fits a product card and there's nothing to choose.
  focus: { x: number; y: number } | null;
}

// Product cards are 4:5; the suggestion is where a 4:5 window over the photo
// lands on the most eye-catching part.
const CARD_RATIO = 4 / 5;
const ANALYSIS_SIZE = 240;

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
    // A suggestion is a bonus — never fail an upload over it.
    const focus = await this.suggestFocus(thumb.buffer).catch(() => null);

    return { display, thumb, focus };
  }

  // Only *looks* at the photo — the stored files are never cropped. Uses
  // sharp's "attention" crop on a small copy (skin tones, saturated colour,
  // detail) and turns where that window landed into a CSS object-position
  // percentage, so the card shows the same part of the full photo.
  async suggestFocus(input: Buffer): Promise<{ x: number; y: number } | null> {
    const small = await sharp(input)
      .rotate()
      .resize({
        width: ANALYSIS_SIZE,
        height: ANALYSIS_SIZE,
        fit: 'inside',
      })
      .toBuffer({ resolveWithObject: true });
    const { width, height } = small.info;
    const ratio = width / height;
    // Within ~3% of 4:5 a card shows essentially the whole photo.
    if (Math.abs(ratio - CARD_RATIO) / CARD_RATIO < 0.03) return null;

    const tall = ratio < CARD_RATIO;
    const cropW = tall ? width : Math.round(height * CARD_RATIO);
    const cropH = tall ? Math.round(width / CARD_RATIO) : height;
    const { info } = await sharp(small.data)
      .resize({
        width: cropW,
        height: cropH,
        fit: 'cover',
        position: sharp.strategy.attention,
      })
      .toBuffer({ resolveWithObject: true });
    // sharp reports the crop offset as a negative number of pixels.
    const offsetX = Math.abs(info.cropOffsetLeft ?? 0);
    const offsetY = Math.abs(info.cropOffsetTop ?? 0);
    const pct = (offset: number, free: number) =>
      free <= 0
        ? 50
        : Math.min(100, Math.max(0, Math.round((offset / free) * 100)));
    return tall
      ? { x: 50, y: pct(offsetY, height - cropH) }
      : { x: pct(offsetX, width - cropW), y: 50 };
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
