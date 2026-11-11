"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/lib/types";
import { discountedPrice } from "@/lib/pricing";
import { useStoreSlug } from "./store-context";

import { productName } from "@/lib/product-name";
export interface CartLine {
  productId: string;
  title: string;
  price: number;
  image: string | null;
  // The image's focus as a CSS object-position. Missing on lines added
  // before this existed — those show the default crop.
  imagePosition?: string | null;
  quantity: number;
  // Picked option, when the product offers sizes/colors. Missing on lines
  // saved before options existed — treated the same as null.
  size?: string | null;
  color?: string | null;
  // Most of this product the cart may hold (across all its sizes/colors),
  // as of when it was added or last re-checked. Null/missing = no limit
  // (not tracking stock, or a pre-order). The API re-checks at checkout.
  stockLimit?: number | null;
  preorderCollectionId: string | null;
  preorderCollectionTitle: string | null;
  preorderDepositType: "FULL" | "PERCENTAGE" | null;
  preorderDepositPercentage: number | null;
  preorderFulfillmentNote: string | null;
}

export interface CartLineOptions {
  size?: string | null;
  color?: string | null;
}

// The same product in two sizes/colors is two separate lines, so lines are
// addressed by product + options rather than by productId alone.
export function cartLineKey(line: { productId: string } & CartLineOptions): string {
  return [line.productId, line.size ?? "", line.color ?? ""].join("|");
}

export type AddItemResult = "added" | "mixed-cart" | "stock-limit";

export function stockLimitOf(product: Product): number | null {
  return product.trackStock && !product.preorder ? product.stock : null;
}

// How many of a product the cart holds across all its size/color lines —
// they all draw from the same stock.
export function quantityInCart(lines: CartLine[], productId: string): number {
  return lines.reduce((sum, l) => (l.productId === productId ? sum + l.quantity : sum), 0);
}

// Refreshes each line's stock limit and trims quantities to fit, earlier
// lines first. A line trimmed to nothing is dropped.
export function clampLinesToStock(
  lines: CartLine[],
  limits: Map<string, number | null>,
): CartLine[] {
  const used = new Map<string, number>();
  const next: CartLine[] = [];
  for (const line of lines) {
    if (!limits.has(line.productId)) {
      next.push(line);
      continue;
    }
    const limit = limits.get(line.productId) ?? null;
    const already = used.get(line.productId) ?? 0;
    const quantity = limit === null ? line.quantity : Math.min(line.quantity, limit - already);
    if (quantity <= 0) continue;
    used.set(line.productId, already + quantity);
    next.push({ ...line, quantity, stockLimit: limit });
  }
  return next;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  total: number;
  /** The pre-order collection this cart is locked to, or null for a regular cart. */
  preorderCollectionId: string | null;
  /**
   * Adds a product to the cart. Leaves the cart unchanged and returns
   * "mixed-cart" when it would mix regular items with pre-order items, or
   * pre-order items from two different collections — the deposit math only
   * makes sense when a cart is either all-regular or all-from-one pre-order
   * collection — or "stock-limit" when the cart already holds all the stock.
   */
  addItem: (product: Product, quantity?: number, options?: CartLineOptions) => AddItemResult;
  /** Capped at the product's stock limit. */
  updateQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  /** See clampLinesToStock. */
  applyStockLimits: (limits: Map<string, number | null>) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const slug = useStoreSlug();
  const storageKey = `selltns-cart:${slug}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      // One-time hydration from localStorage after mount — deliberately deferred
      // to this effect (rather than a lazy useState initializer) so the client's
      // first render matches the server-rendered empty cart and avoids a
      // hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore malformed local storage
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [lines, hydrated, storageKey]);

  const addItem = useCallback((product: Product, quantity = 1, options: CartLineOptions = {}) => {
    let result: AddItemResult = "added";
    const stockLimit = stockLimitOf(product);
    const size = options.size ?? null;
    const color = options.color ?? null;
    const key = cartLineKey({ productId: product.id, size, color });
    setLines((prev) => {
      if (stockLimit !== null && quantityInCart(prev, product.id) + quantity > stockLimit) {
        result = "stock-limit";
        return prev;
      }
      const existing = prev.find((l) => cartLineKey(l) === key);
      if (existing) {
        return prev.map((l) =>
          cartLineKey(l) === key
            ? { ...l, quantity: l.quantity + quantity, stockLimit }
            : l,
        );
      }
      const cartCollectionId = prev.find((l) => l.preorderCollectionId)
        ?.preorderCollectionId;
      const cartHasRegularItems = prev.some((l) => !l.preorderCollectionId);
      const newIsPreorder = !!product.preorder;
      const mixesRegularAndPreorder =
        (cartCollectionId && !newIsPreorder) ||
        (cartHasRegularItems && newIsPreorder);
      const mixesDifferentPreorders =
        cartCollectionId &&
        newIsPreorder &&
        product.preorder!.collectionId !== cartCollectionId;
      if (prev.length > 0 && (mixesRegularAndPreorder || mixesDifferentPreorders)) {
        result = "mixed-cart";
        return prev;
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: productName(product),
          price: discountedPrice(product),
          image: product.images[0] ?? null,
          imagePosition: product.images[0] ? (product.imageFocus?.[product.images[0]] ?? null) : null,
          quantity,
          size,
          color,
          stockLimit,
          preorderCollectionId: product.preorder?.collectionId ?? null,
          preorderCollectionTitle: product.preorder?.collectionTitle ?? null,
          preorderDepositType: product.preorder?.depositType ?? null,
          preorderDepositPercentage: product.preorder?.depositPercentage ?? null,
          preorderFulfillmentNote: product.preorder?.fulfillmentNote ?? null,
        },
      ];
    });
    return result;
  }, []);

  const updateQuantity = useCallback((lineKey: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => cartLineKey(l) !== lineKey)
        : prev.map((l) => {
            if (cartLineKey(l) !== lineKey) return l;
            if (l.stockLimit == null) return { ...l, quantity };
            const others = quantityInCart(prev, l.productId) - l.quantity;
            return { ...l, quantity: Math.min(quantity, Math.max(l.stockLimit - others, 1)) };
          }),
    );
  }, []);

  const applyStockLimits = useCallback((limits: Map<string, number | null>) => {
    setLines((prev) => clampLinesToStock(prev, limits));
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setLines((prev) => prev.filter((l) => cartLineKey(l) !== lineKey));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const total = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
    const preorderCollectionId =
      lines.find((l) => l.preorderCollectionId)?.preorderCollectionId ?? null;
    return {
      lines,
      count,
      total,
      preorderCollectionId,
      addItem,
      updateQuantity,
      removeItem,
      applyStockLimits,
      clear,
    };
  }, [lines, addItem, updateQuantity, removeItem, applyStockLimits, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
