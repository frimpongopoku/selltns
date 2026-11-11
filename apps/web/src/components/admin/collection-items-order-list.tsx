"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductThumb } from "@/components/admin/product-picker";
import type { Product } from "@/lib/types";

import { productName } from "@/lib/product-name";
// Stable key for one collection item — a resold product is keyed by its
// listing (what AffiliateCollectionItem keys on), the tenant's own by id.
export function collectionItemKey(product: Product) {
  return product.affiliateSource ? `listing:${product.affiliateSource.listingId}` : product.id;
}

// Everything in a collection — the tenant's own products and the ones it
// resells — as one list, in the order the storefront shows them. Both kinds
// share one position space server-side, so they can be freely interleaved.
export function CollectionItemsOrderList({
  items,
  onMove,
  onRemove,
  onAdd,
}: {
  items: Product[];
  onAdd: () => void;
  onMove: (key: string, direction: "up" | "down") => void;
  onRemove: (product: Product) => void;
}) {
  if (items.length === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
      >
        <Plus className="h-5 w-5" />
        <span className="font-medium text-foreground">Add products</span>
        No products in this collection yet.
      </button>
    );
  }

  return (
    <div className="rounded-lg border">
      <p className="border-b px-2.5 py-1.5 text-xs text-muted-foreground">
        {items.length} product{items.length === 1 ? "" : "s"}
        {items.length > 1 && " — shown on your storefront in this order"}
      </p>
      <div className="max-h-96 overflow-y-auto">
        {items.map((product, i) => {
          const key = collectionItemKey(product);
          return (
            <div key={key} className="flex items-center gap-2.5 border-b p-2 text-sm last:border-b-0">
              <div className="flex shrink-0 flex-col">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Move ${productName(product)} up`}
                  disabled={i === 0}
                  onClick={() => onMove(key, "up")}
                  className="h-5"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Move ${productName(product)} down`}
                  disabled={i === items.length - 1}
                  onClick={() => onMove(key, "down")}
                  className="h-5"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <ProductThumb product={product} />
              <span className="flex-1 truncate">{productName(product)}</span>
              {product.affiliateSource && (
                <Badge variant="outline" className="max-w-[140px] shrink-0 truncate text-[10px]">
                  Resold · {product.affiliateSource.ownerTenantName}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => onRemove(product)}
                aria-label={`Remove ${productName(product)}`}
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
