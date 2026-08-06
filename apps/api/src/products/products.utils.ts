export interface ProductCursor {
  displayOrder: number;
  id: string;
}

// Opaque keyset-pagination cursor over (displayOrder, id) — the same order
// the storefront renders products in, so infinite scroll in the admin
// matches what a customer sees.
export function encodeCursor(cursor: ProductCursor): string {
  return Buffer.from(`${cursor.displayOrder}_${cursor.id}`, 'utf8').toString(
    'base64url',
  );
}

export function decodeCursor(raw: string | undefined): ProductCursor | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const separatorIndex = decoded.indexOf('_');
    if (separatorIndex === -1) return null;
    const displayOrder = Number(decoded.slice(0, separatorIndex));
    const id = decoded.slice(separatorIndex + 1);
    if (Number.isNaN(displayOrder) || !id) return null;
    return { displayOrder, id };
  } catch {
    return null;
  }
}
