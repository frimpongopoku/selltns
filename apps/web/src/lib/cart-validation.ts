import { toast } from "sonner";
import type { CartLine } from "@/components/storefront/cart-provider";
import { getProducts } from "./api";

// Cross-checks cart lines against the tenant's current product list. A
// vendor can unpublish (or delete) a product while it's already sitting in
// someone's cart, so this is called both whenever the cart is opened and
// again right before an order is actually submitted — never trusting
// whatever the client last saw. Returns the titles of any lines that were
// stale and removes them via `removeItem`.
export async function pruneStaleCartLines(
  tenantId: string,
  lines: CartLine[],
  removeItem: (productId: string) => void,
): Promise<string[]> {
  if (lines.length === 0) return [];
  const products = await getProducts(tenantId, true);
  const byId = new Map(products.map((p) => [p.id, p]));
  const removedTitles: string[] = [];
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || !product.isActive) {
      removedTitles.push(line.title);
      removeItem(line.productId);
    }
  }
  return removedTitles;
}

export function notifyRemovedCartLines(removedTitles: string[]) {
  if (removedTitles.length === 0) return;
  toast.info(
    removedTitles.length === 1
      ? `"${removedTitles[0]}" is no longer available and was removed from your cart.`
      : `${removedTitles.length} items are no longer available and were removed from your cart.`,
  );
}
