import { BadRequestException } from '@nestjs/common';
import { normalizeTags as normalizeTagsShared } from '../common/normalize-tags';
import {
  decodeCreatedAtCursor,
  encodeCreatedAtCursor,
  type CreatedAtCursor,
} from '../common/cursor';
import {
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_ASSET,
  MAX_TITLE_LENGTH,
} from './media.constants';

export function normalizeTitle(
  title: string | undefined | null,
): string | null {
  const trimmed = title?.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new BadRequestException(
      `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
    );
  }
  return trimmed;
}

export function normalizeTags(raw: unknown): string[] {
  return normalizeTagsShared(raw, {
    maxTags: MAX_TAGS_PER_ASSET,
    maxTagLength: MAX_TAG_LENGTH,
    noun: 'photo',
  });
}

export type MediaCursor = CreatedAtCursor;
export const encodeCursor = encodeCreatedAtCursor;
export const decodeCursor = decodeCreatedAtCursor;
