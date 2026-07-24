"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
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
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock <= 0;

  return (
    <Button
      type="button"
      disabled={outOfStock}
      onClick={() => {
        addItem(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className="store-btn-primary gap-1.5 border-0 shadow-none"
      size={size}
    >
      <span
        key={added ? "added" : "idle"}
        className="flex items-center gap-1.5 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {outOfStock ? null : added ? (
          <Check className="h-4 w-4" />
        ) : (
          <ShoppingBag className="h-4 w-4" />
        )}
        {outOfStock ? "Out of stock" : added ? "Added" : "Add to cart"}
      </span>
    </Button>
  );
}
