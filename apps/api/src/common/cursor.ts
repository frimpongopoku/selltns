export interface CreatedAtCursor {
  createdAt: Date;
  id: string;
}

// Opaque keyset-pagination cursor: base64("<createdAt ISO>_<id>"). Encoding
// both fields means a paginated findAll can page consistently without a
// second lookup query, and ties on createdAt (unlikely but possible) still
// sort stably. Shared by media and collections — both paginate by
// createdAt DESC. Products uses its own displayOrder-based cursor instead.
export function encodeCreatedAtCursor(cursor: CreatedAtCursor): string {
  return Buffer.from(
    `${cursor.createdAt.toISOString()}_${cursor.id}`,
    'utf8',
  ).toString('base64url');
}

export function decodeCreatedAtCursor(
  raw: string | undefined,
): CreatedAtCursor | null {
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
