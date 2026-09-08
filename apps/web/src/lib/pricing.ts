import type { Product } from "./types";

type PricedProduct = Pick<Product, "price" | "discountPrice">;

export function isOnSale(product: PricedProduct): boolean {
  return product.discountPrice != null && product.discountPrice < product.price;
}

// The price to actually show/charge as "now" — the discount price when one
// is active, otherwise the regular price.
export function discountedPrice(product: PricedProduct): number {
  return isOnSale(product) ? (product.discountPrice as number) : product.price;
}
