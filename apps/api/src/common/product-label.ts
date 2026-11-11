// What to call a product wherever a name is needed (order lines, receipts,
// emails, error messages). Products may have no name; those are called by
// their per-shop number instead, so nothing ever reads "Untitled".
export function productLabel(product: {
  title: string;
  number: number;
}): string {
  return product.title.trim() || `Item #${product.number}`;
}
