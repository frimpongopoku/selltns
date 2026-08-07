"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/components/storefront/cart-provider";
import { useStoreSlug } from "@/components/storefront/store-context";
import { formatMoney } from "@/lib/format";

export default function CartPage() {
  const { lines, total, updateQuantity, removeItem } = useCart();
  const slug = useStoreSlug();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl animate-in fade-in-0 px-4 py-24 text-center duration-500 sm:px-6">
        <h1 className="store-heading text-2xl font-semibold">Your cart is empty</h1>
        <p className="store-muted mt-3">Add something you love to get started.</p>
        <Link href={`/${slug}`} className="store-btn-primary mt-7 inline-block px-6 py-3 text-sm font-medium">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-in fade-in-0 slide-in-from-bottom-2 px-4 py-12 duration-500 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="store-heading text-3xl font-semibold">Your cart</h1>
      <div className="mt-8 divide-y divide-[var(--store-border)]">
        {lines.map((line) => (
          <div key={line.productId} className="flex gap-4 py-5">
            <div
              className="store-card h-20 w-20 shrink-0 bg-cover bg-top"
              style={line.image ? { backgroundImage: `url(${line.image})` } : undefined}
            />

            {/* Mobile: image on the left, everything else stacked in its own lines. */}
            <div className="flex flex-1 flex-col gap-2 sm:hidden">
              <div className="flex items-start justify-between gap-3">
                <p className="store-heading text-base leading-snug">{line.title}</p>
                <button
                  type="button"
                  onClick={() => removeItem(line.productId)}
                  className="shrink-0 rounded-full p-1 store-muted transition-colors hover:bg-[var(--store-hover-bg)] hover:text-[var(--store-fg)]"
                  aria-label="Remove item"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="store-accent-text text-sm font-medium">
                {formatMoney(line.price * line.quantity)}
                {line.quantity > 1 && (
                  <span className="store-muted ml-1.5 font-normal">
                    ({formatMoney(line.price)} each)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                  className="store-card flex h-8 w-8 items-center justify-center transition-colors hover:bg-[var(--store-hover-bg)] active:scale-95"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                  className="store-card flex h-8 w-8 items-center justify-center transition-colors hover:bg-[var(--store-hover-bg)] active:scale-95"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Desktop/tablet: compact single row. */}
            <div className="hidden flex-1 items-center gap-4 sm:flex">
              <div className="flex-1">
                <p className="store-heading text-base">{line.title}</p>
                <p className="store-accent-text text-sm">{formatMoney(line.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                  className="store-card flex h-8 w-8 items-center justify-center transition-colors hover:bg-[var(--store-hover-bg)] active:scale-95"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                  className="store-card flex h-8 w-8 items-center justify-center transition-colors hover:bg-[var(--store-hover-bg)] active:scale-95"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="w-20 text-right text-sm font-medium">
                {formatMoney(line.price * line.quantity)}
              </p>
              <button
                type="button"
                onClick={() => removeItem(line.productId)}
                className="ml-2 rounded-full p-1 store-muted transition-colors hover:bg-[var(--store-hover-bg)] hover:text-[var(--store-fg)]"
                aria-label="Remove item"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between border-t border-[var(--store-border)] pt-6">
        <p className="store-heading text-lg font-semibold">Total</p>
        <p className="store-heading text-lg font-semibold">{formatMoney(total)}</p>
      </div>
      <div className="mt-6 flex justify-end">
        <Link
          href={`/${slug}/checkout`}
          className="store-btn-primary inline-flex items-center justify-center px-8 py-3.5 text-base font-medium"
        >
          Submit order request
        </Link>
      </div>
    </div>
  );
}
