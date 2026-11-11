"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarClock } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { discountedPrice, isOnSale } from "@/lib/pricing";
import { AddToCartButton } from "./add-to-cart-button";
import { useStoreHref } from "./store-context";
import { productPath } from "@/lib/product-path";
import { productOptionsLine } from "@/lib/item-options";
import { productImagePosition } from "@/lib/image-focus";
import { hasName, productName, productNumber } from "@/lib/product-name";

export function ProductCard({ product }: { product: Product }) {
  const href = useStoreHref(productPath(product));
  const onSale = isOnSale(product);
  const hasOptions = (product.sizes?.length ?? 0) > 0 || (product.colors?.length ?? 0) > 0;
  // Sizes and colors on one quiet, single-line row — truncated rather than
  // wrapped so cards in a grid stay the same height.
  const optionsLine = [productOptionsLine(product.sizes), productOptionsLine(product.colors)]
    .filter(Boolean)
    .join("  |  ");
  const outOfStock = product.trackStock && product.stock <= 0 && !product.preorder;
  const named = hasName(product);
  const price = (
    <>
      {onSale && (
        <span className="store-muted text-[0.7rem] line-through sm:text-xs">{formatMoney(product.price)}</span>
      )}
      <span
        className={
          named
            ? "store-accent-text text-xs font-medium sm:text-sm"
            : "store-heading text-sm font-semibold sm:text-base"
        }
      >
        {formatMoney(discountedPrice(product))}
      </span>
    </>
  );

  return (
    <div className="store-card group flex h-full flex-col overflow-hidden bg-[var(--store-bg)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={productName(product)}
            fill
            sizes="(max-width: 768px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            style={{ objectPosition: productImagePosition(product, product.images[0]) }}
          />
        ) : (
          <div className="h-full w-full bg-[var(--store-hover-bg)]" />
        )}
        {product.preorder ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[0.65rem] font-medium text-white sm:px-2.5 sm:py-1 sm:text-xs">
            <CalendarClock className="h-3 w-3" />
            Pre-order
          </span>
        ) : (
          product.trackStock && product.stock <= 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[0.65rem] text-white sm:px-2.5 sm:py-1 sm:text-xs">
              Out of stock
            </span>
          )
        )}
        {onSale && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600/90 px-2 py-0.5 text-[0.65rem] font-medium text-white sm:px-2.5 sm:py-1 sm:text-xs">
            Sale
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-5">
        {named ? (
          <>
            <Link href={href}>
              <h3 className="store-heading line-clamp-2 text-sm leading-snug transition-colors group-hover:text-[var(--store-primary)] sm:text-base">
                {product.title}
              </h3>
            </Link>
            {optionsLine && (
              <p className="store-muted -mt-0.5 truncate text-[0.7rem] sm:text-xs" title={optionsLine}>
                {optionsLine}
              </p>
            )}
            <p className="flex items-baseline gap-1.5">{price}</p>
          </>
        ) : (
          // No name: the price leads, with the product number beside it so
          // customers still have something to ask about.
          <>
            <Link href={href} className="flex items-baseline gap-1.5">
              {price}
              <span className="store-muted ml-auto shrink-0 text-[0.7rem] tabular-nums sm:text-xs">
                {productNumber(product)}
              </span>
            </Link>
            {optionsLine && (
              <p className="store-muted -mt-0.5 truncate text-[0.7rem] sm:text-xs" title={optionsLine}>
                {optionsLine}
              </p>
            )}
          </>
        )}
        <div className="mt-auto pt-2 sm:pt-3">
          {/* A size/color has to be picked first, which only the product page offers. */}
          {hasOptions && !outOfStock ? (
            <Link
              href={href}
              className="store-btn-primary flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium"
            >
              Choose options
            </Link>
          ) : (
            <AddToCartButton product={product} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}
