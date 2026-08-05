import { BadRequestException } from '@nestjs/common';
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

// Tags are lowercased + deduped so search/filtering is predictable — the
// same UX as GitHub labels or Notion tags, just case-insensitive.
export function normalizeTags(raw: unknown): string[] {
  if (raw === undefined || raw === null || raw === '') return [];

  let values: unknown[];
  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      values = Array.isArray(parsed) ? parsed : [raw];
    } catch {
      values = raw.split(',');
    }
  } else {
    throw new BadRequestException(
      'tags must be an array or JSON-encoded array of strings.',
    );
  }

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const tag = value.trim().toLowerCase();
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) {
      throw new BadRequestException(
        `Tags must be ${MAX_TAG_LENGTH} characters or fewer.`,
      );
    }
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  if (tags.length > MAX_TAGS_PER_ASSET) {
    throw new BadRequestException(
      `A photo can have at most ${MAX_TAGS_PER_ASSET} tags.`,
    );
  }
  return tags;
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
