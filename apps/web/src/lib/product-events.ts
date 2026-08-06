import type { Product } from "./types";

// Lightweight pub/sub between sibling client islands on the products page
// (the quick-create dialog lives in the page header, the explorer owns the
// list) so a product created via the modal shows up immediately without a
// full reload.
const PRODUCT_CREATED_EVENT = "selltns:product-created";

export function emitProductCreated(product: Product) {
  window.dispatchEvent(new CustomEvent<Product>(PRODUCT_CREATED_EVENT, { detail: product }));
}

export function onProductCreated(handler: (product: Product) => void) {
  function listener(event: Event) {
    handler((event as CustomEvent<Product>).detail);
  }
  window.addEventListener(PRODUCT_CREATED_EVENT, listener);
  return () => window.removeEventListener(PRODUCT_CREATED_EVENT, listener);
}
