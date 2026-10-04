import type { Product } from "./types";

// Storefront path to a product's detail page. Native products link by slug.
// A resold (affiliate) product links by id instead: its slug is only unique
// within the *owner's* shop, so the reselling shop can't resolve it — the
// API's affiliate fallback looks listings up by product id — and a slug
// could also collide with one of the reseller's own products.
export function productPath(product: Pick<Product, "id" | "slug" | "affiliateSource">): string {
  return `/products/${product.affiliateSource ? product.id : product.slug}`;
}
