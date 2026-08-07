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
import { useStoreSlug } from "./store-context";

export interface CartLine {
  productId: string;
  title: string;
  price: number;
  image: string | null;
  quantity: number;
  preorderCollectionId: string | null;
  preorderCollectionTitle: string | null;
  preorderDepositType: "FULL" | "PERCENTAGE" | null;
  preorderDepositPercentage: number | null;
  preorderFulfillmentNote: string | null;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  total: number;
  /** The pre-order collection this cart is locked to, or null for a regular cart. */
  preorderCollectionId: string | null;
  /**
   * Adds a product to the cart. Returns false (without changing the cart) when
   * it would mix regular items with pre-order items, or pre-order items from
   * two different collections — the deposit math only makes sense when a
   * cart is either all-regular or all-from-one pre-order collection.
   */
  addItem: (product: Product, quantity?: number) => boolean;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
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

  const addItem = useCallback((product: Product, quantity = 1) => {
    let ok = true;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: l.quantity + quantity }
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
        ok = false;
        return prev;
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          image: product.images[0] ?? null,
          quantity,
          preorderCollectionId: product.preorder?.collectionId ?? null,
          preorderCollectionTitle: product.preorder?.collectionTitle ?? null,
          preorderDepositType: product.preorder?.depositType ?? null,
          preorderDepositPercentage: product.preorder?.depositPercentage ?? null,
          preorderFulfillmentNote: product.preorder?.fulfillmentNote ?? null,
        },
      ];
    });
    return ok;
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
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
      clear,
    };
  }, [lines, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
