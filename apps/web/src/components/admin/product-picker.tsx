"use client";

import { useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useProductLibrary } from "@/lib/use-product-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { Product } from "@/lib/types";

// Search-and-paginate product picker for building a collection — a plain
// checkbox list doesn't scale once a shop has hundreds or thousands of
// products, so this reuses the same search/pagination infrastructure as the
// main Products page instead of ever holding the full catalog in memory.
export function ProductPicker({
  tenantId,
  selected,
  onToggle,
}: {
  tenantId: string;
  /** Full Product objects for already-selected items, keyed by id — lets selected chips render titles even for products outside the current search page. */
  selected: Map<string, Product>;
  onToggle: (product: Product) => void;
}) {
  const {
    products,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    query,
    setQuery,
  } = useProductLibrary(tenantId);
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
    root: listEl,
  });

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Array.from(selected.values()).map((product) => (
            <Badge key={product.id} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1.5">
              <span className="max-w-[160px] truncate">{product.title}</span>
              <button
                type="button"
                onClick={() => onToggle(product)}
                aria-label={`Remove ${product.title}`}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by title or tag…"
          className="pl-8"
        />
      </div>

      <div ref={setListEl} className="mt-2 max-h-72 overflow-y-auto rounded-lg border">
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {query ? "No products match your search." : "No products yet."}
          </p>
        ) : (
          <>
            {products.map((product) => {
              const checked = selected.has(product.id);
              const disabled = !product.isActive && !checked;
              return (
                <label
                  key={product.id}
                  className={`flex items-center gap-2.5 border-b p-2.5 text-sm last:border-b-0 ${disabled ? "opacity-50" : ""}`}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => onToggle(product)}
                  />
                  <span className="flex-1 truncate">{product.title}</span>
                  {!product.isActive && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Not live
                    </Badge>
                  )}
                </label>
              );
            })}
            <div ref={sentinelRef} className="flex justify-center p-2">
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
