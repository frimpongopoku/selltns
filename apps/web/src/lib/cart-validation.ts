import { toast } from "sonner";
import {
  cartLineKey,
  clampLinesToStock,
  stockLimitOf,
  type CartLine,
} from "@/components/storefront/cart-provider";
import { getProducts } from "./api";

export interface CartCheckResult {
  /** Titles of lines removed because the product is gone, hidden, or sold out. */
  removed: string[];
  /** Titles of lines whose quantity was lowered to what's left in stock. */
  reduced: string[];
}

// Cross-checks cart lines against the tenant's current product list. A
// vendor can unpublish (or delete) a product while it's already sitting in
// someone's cart, so this is called both whenever the cart is opened and
// again right before an order is actually submitted — never trusting
// whatever the client last saw. A line whose picked size/color the product
// no longer offers (or that's missing one the product now requires) is
// stale too. Quantities are also trimmed to the product's current stock.
export async function pruneStaleCartLines(
  tenantId: string,
  lines: CartLine[],
  removeItem: (lineKey: string) => void,
  applyStockLimits: (limits: Map<string, number | null>) => void,
): Promise<CartCheckResult> {
  const result: CartCheckResult = { removed: [], reduced: [] };
  if (lines.length === 0) return result;
  const products = await getProducts(tenantId, true);
  const byId = new Map(products.map((p) => [p.id, p]));
  const kept: CartLine[] = [];
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || !product.isActive || !optionStillOffered(product.sizes ?? [], line.size)
      || !optionStillOffered(product.colors ?? [], line.color)) {
      result.removed.push(line.title);
      removeItem(cartLineKey(line));
    } else {
      kept.push(line);
    }
  }

  const limits = new Map(
    kept.map((line) => [line.productId, stockLimitOf(byId.get(line.productId)!)]),
  );
  const clamped = new Map(clampLinesToStock(kept, limits).map((l) => [cartLineKey(l), l]));
  for (const line of kept) {
    const after = clamped.get(cartLineKey(line));
    if (!after) result.removed.push(line.title);
    else if (after.quantity < line.quantity) result.reduced.push(line.title);
  }
  applyStockLimits(limits);
  return result;
}

function optionStillOffered(offered: string[], picked: string | null | undefined) {
  return offered.length === 0 || (!!picked && offered.includes(picked));
}

export function cartChanged(result: CartCheckResult): boolean {
  return result.removed.length > 0 || result.reduced.length > 0;
}

export function notifyRemovedCartLines({ removed, reduced }: CartCheckResult) {
  if (removed.length > 0) {
    toast.info(
      removed.length === 1
        ? `"${removed[0]}" is no longer available and was removed from your cart.`
        : `${removed.length} items are no longer available and were removed from your cart.`,
    );
  }
  if (reduced.length > 0) {
    toast.info(
      reduced.length === 1
        ? `Only a few of "${reduced[0]}" are left, so we lowered the quantity in your cart.`
        : `${reduced.length} items have less stock left, so we lowered their quantities in your cart.`,
    );
  }
}
