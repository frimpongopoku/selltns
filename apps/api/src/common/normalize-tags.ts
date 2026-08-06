import { BadRequestException } from '@nestjs/common';

export interface NormalizeTagsOptions {
  maxTags?: number;
  maxTagLength?: number;
  /** Used in error messages, e.g. "photo" or "product". */
  noun?: string;
}

// Tags are lowercased + deduped so search/filtering is predictable — the
// same UX as GitHub labels or Notion tags, just case-insensitive. Shared by
// media and products so both tag the same way.
export function normalizeTags(
  raw: unknown,
  options: NormalizeTagsOptions = {},
): string[] {
  const maxTags = options.maxTags ?? 10;
  const maxTagLength = options.maxTagLength ?? 30;
  const noun = options.noun ?? 'item';

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
    if (tag.length > maxTagLength) {
      throw new BadRequestException(
        `Tags must be ${maxTagLength} characters or fewer.`,
      );
    }
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  if (tags.length > maxTags) {
    throw new BadRequestException(
      `A ${noun} can have at most ${maxTags} tags.`,
    );
  }
  return tags;
}
