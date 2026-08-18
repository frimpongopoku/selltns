"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";
import { useStoreHref } from "./store-context";

export function CartIndicator() {
  const { count } = useCart();
  const href = useStoreHref("/cart");
  return (
    <Link
      href={href}
      className="relative flex items-center gap-2 rounded-full px-3 py-2 transition-colors duration-150 hover:bg-[var(--store-hover-bg)]"
    >
      <ShoppingBag className="h-5 w-5" />
      <span className="hidden sm:inline text-sm">Cart</span>
      {count > 0 && (
        <span
          key={count}
          className="absolute -top-1 -right-1 flex h-5 w-5 animate-in zoom-in-50 items-center justify-center rounded-full bg-[var(--store-primary)] text-[10px] font-medium text-[var(--store-primary-fg)] duration-200"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
