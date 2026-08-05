import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { AddToCartButton } from "./add-to-cart-button";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="store-card group flex h-full flex-col overflow-hidden bg-[var(--store-bg)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden"
      >
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-[var(--store-hover-bg)]" />
        )}
        {product.stock <= 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[0.65rem] text-white sm:px-2.5 sm:py-1 sm:text-xs">
            Out of stock
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-5">
        <Link href={`/products/${product.slug}`}>
          <h3 className="store-heading line-clamp-2 min-h-[2.75em] text-sm leading-snug transition-colors group-hover:text-[var(--store-primary)] sm:text-base">
            {product.title}
          </h3>
        </Link>
        <p className="store-accent-text text-xs font-medium sm:text-sm">
          {formatMoney(product.price)}
        </p>
        <div className="mt-auto pt-2 sm:pt-3">
          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </div>
  );
}
