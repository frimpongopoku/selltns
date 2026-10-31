// Mirrors MAX_OPTIONS_PER_PRODUCT on the API — sizes or colors per product.
export const MAX_OPTIONS = 20;

// "M, Black" for an order item or cart line that carries a picked size
// and/or color — empty when it has neither.
export function itemOptionsLabel(item: {
  size?: string | null;
  color?: string | null;
}): string {
  return [item.size, item.color].filter(Boolean).join(", ");
}

// "Dress (M, Black)" — for one-line order summaries and share text.
export function itemWithOptions(item: {
  title: string;
  size?: string | null;
  color?: string | null;
}): string {
  const options = itemOptionsLabel(item);
  return options ? `${item.title} (${options})` : item.title;
}

// "S · M · L" — a product's offered sizes or colors on one line, for list
// views. Empty when it offers none.
export function productOptionsLine(options: string[] | undefined): string {
  return (options ?? []).join(" · ");
}
