"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List, Loader2, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductsTableView } from "@/components/admin/products-table-view";
import { ProductsGridView } from "@/components/admin/products-grid-view";
import { getProductTags } from "@/lib/api";
import { useProductLibrary, type ProductStatusFilter } from "@/lib/use-product-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { onProductCreated } from "@/lib/product-events";

const VIEW_MODE_KEY = "selltns:admin:products:view";
type ViewMode = "table" | "grid";

const STATUS_TABS: { value: ProductStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Live" },
  { value: "inactive", label: "Not live" },
];

export function ProductsExplorer({ tenantId }: { tenantId: string }) {
  const {
    products,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    query,
    setQuery,
    status,
    setStatus,
    tag,
    setTag,
    prepend,
    updateProductInList,
  } = useProductLibrary(tenantId);

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  useEffect(() => {
    getProductTags(tenantId).then(setAvailableTags);
  }, [tenantId]);

  useEffect(() => onProductCreated(prepend), [prepend]);

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_MODE_KEY);
    if (saved === "grid" || saved === "table") setViewMode(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const isFiltered = query.trim() !== "" || status !== "all" || tag !== null;

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
  });

  function handleToggled(id: string, isActive: boolean) {
    const product = products.find((p) => p.id === id);
    if (product) updateProductInList({ ...product, isActive });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or tag…"
              className="pl-8"
            />
          </div>
        </div>

        <Tabs value={status} onValueChange={(v) => setStatus(v as ProductStatusFilter)}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            type="button"
            size="icon-sm"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            onClick={() => setViewMode("table")}
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {availableTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                tag === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t}
            </button>
          ))}
          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setTag(null);
              }}
              className="inline-flex items-center gap-1 px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        viewMode === "grid" ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="mt-6 h-64 animate-pulse rounded-lg bg-muted" />
        )
      ) : products.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-medium">{isFiltered ? "No products match your search" : "No products yet"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isFiltered
              ? "Try a different title, tag, or status."
              : "Add your first product to start building your catalog."}
          </p>
        </Card>
      ) : (
        <>
          {viewMode === "grid" ? (
            <ProductsGridView products={products} tenantId={tenantId} onToggled={handleToggled} />
          ) : (
            <ProductsTableView products={products} tenantId={tenantId} onToggled={handleToggled} />
          )}

          <div ref={sentinelRef} className="mt-6 flex justify-center">
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {!hasMore && (
              <p className="text-xs text-muted-foreground">
                {products.length} product{products.length === 1 ? "" : "s"} — you&apos;ve reached the end.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
