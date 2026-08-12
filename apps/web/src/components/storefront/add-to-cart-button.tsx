"use client";

import { useState } from "react";
import { Check, CalendarClock, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "./cart-provider";
import type { Product } from "@/lib/types";

export function AddToCartButton({
  product,
  size = "default",
}: {
  product: Product;
  size?: "sm" | "default";
}) {
  const { addItem, preorderCollectionId } = useCart();
  const [added, setAdded] = useState(false);
  const isPreorder = !!product.preorder;
  // Made-to-order pre-order items aren't tracked by stock count the way
  // regular inventory is — a pre-order product legitimately sits at 0 stock.
  const outOfStock = product.stock <= 0 && !isPreorder;
  // "Add to cart" implies off-the-shelf stock — wrong mental model for a
  // made-to-order piece, so pre-order gets its own reserve-flavored action
  // and icon instead of the shopping-bag/cart metaphor.
  const label = isPreorder ? "Reserve this piece" : "Add to cart";
  const shortLabel = isPreorder ? "Reserve" : "Add";
  const addedLabel = isPreorder ? "Reserved" : "Added";

  return (
    <Button
      type="button"
      disabled={outOfStock}
      onClick={() => {
        const ok = addItem(product);
        if (!ok) {
          toast.error(
            preorderCollectionId
              ? "Your cart has a pre-order in it. Finish that checkout first, or clear your cart, before adding regular items."
              : "Your cart has regular items in it. Pre-order items need their own checkout — clear your cart first.",
          );
          return;
        }
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className={`store-btn-primary h-auto w-full gap-1.5 border-0 px-4 py-2.5 shadow-none ${
        isPreorder && !added && !outOfStock ? "animate-attention-pulse" : ""
      }`}
      size={size}
    >
      <span
        key={added ? "added" : "idle"}
        className="flex items-center gap-1.5 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {outOfStock ? null : added ? (
          <Check className="h-4 w-4" />
        ) : isPreorder ? (
          <CalendarClock className="h-4 w-4" />
        ) : (
          <ShoppingBag className="h-4 w-4" />
        )}
        {outOfStock ? "Out of stock" : added ? addedLabel : size === "sm" ? shortLabel : label}
      </span>
    </Button>
  );
}
