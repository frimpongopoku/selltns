import { BadRequestException } from '@nestjs/common';
import { normalizeTags as normalizeTagsShared } from '../common/normalize-tags';
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

export interface MediaCursor {
  createdAt: Date;
  id: string;
}

// Opaque keyset-pagination cursor: base64("<createdAt ISO>_<id>"). Encoding
// both fields means findAll can page consistently without a second lookup
// query, and ties on createdAt (unlikely but possible) still sort stably.
export function encodeCursor(cursor: MediaCursor): string {
  return Buffer.from(
    `${cursor.createdAt.toISOString()}_${cursor.id}`,
    'utf8',
  ).toString('base64url');
}

export function decodeCursor(raw: string | undefined): MediaCursor | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const separatorIndex = decoded.indexOf('_');
    if (separatorIndex === -1) return null;
    const createdAt = new Date(decoded.slice(0, separatorIndex));
    const id = decoded.slice(separatorIndex + 1);
    if (Number.isNaN(createdAt.getTime()) || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
