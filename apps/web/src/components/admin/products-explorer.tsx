"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List, Loader2, PencilLine, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductsTableView } from "@/components/admin/products-table-view";
import { ProductsGridView } from "@/components/admin/products-grid-view";
import { ProductFlyerManager } from "@/components/admin/product-flyer-manager";
import { BulkEditProductsDialog } from "@/components/admin/bulk-edit-products-dialog";
import { getProductTags } from "@/lib/api";
import { useProductLibrary, type ProductStatusFilter } from "@/lib/use-product-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { onProductCreated } from "@/lib/product-events";
import type { Product, Tenant } from "@/lib/types";

import { productName } from "@/lib/product-name";
const VIEW_MODE_KEY = "selltns:admin:products:view";
type ViewMode = "table" | "grid";

const STATUS_TABS: { value: ProductStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Live" },
  { value: "inactive", label: "Not live" },
];

export function ProductsExplorer({ tenantId, tenant }: { tenantId: string; tenant: Tenant }) {
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
    moveProduct,
  } = useProductLibrary(tenantId);

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [flyerProduct, setFlyerProduct] = useState<Product | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  useEffect(() => {
    getProductTags(tenantId).then(setAvailableTags);
  }, [tenantId]);

  useEffect(() => onProductCreated(prepend), [prepend]);

  useEffect(() => {
    // `localStorage`/`matchMedia` don't exist during SSR, so the saved (or
    // device-appropriate default) view can only be known post-mount —
    // computing it during render would disagree with the server-rendered
    // HTML and trigger a hydration mismatch.
    const saved = window.localStorage.getItem(VIEW_MODE_KEY);
    // Table view's columns don't fit a phone screen without horizontal
    // scrolling — grid's card layout keeps the flyer button and reorder
    // controls reachable without it, so default to grid there when the
    // vendor hasn't picked a view yet.
    const next =
      saved === "grid" || saved === "table"
        ? saved
        : window.matchMedia("(max-width: 639px)").matches
          ? "grid"
          : null;
    if (next) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewMode(next);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const isFiltered = query.trim() !== "" || status !== "all" || tag !== null;

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
  });

  // ⌘/Ctrl-click picks a product straight away (entering select mode), and
  // Shift-click picks everything between the last pick and this one — same
  // as the gallery.
  function handleSelect(product: Product, e: React.MouseEvent) {
    if (!selectMode) setSelectMode(true);
    const anchorIndex = anchorId ? products.findIndex((p) => p.id === anchorId) : -1;
    if (e.shiftKey && anchorIndex >= 0) {
      const index = products.findIndex((p) => p.id === product.id);
      const [from, to] = anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex];
      const range = products.slice(from, to + 1).map((p) => p.id);
      setSelectedIds((prev) => new Set([...prev, ...range]));
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(product.id)) next.delete(product.id);
        else next.add(product.id);
        return next;
      });
    }
    setAnchorId(product.id);
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setAnchorId(null);
  }

  const selectedProducts = products.filter((p) => selectedIds.has(p.id));
  const allSelected = products.length > 0 && selectedProducts.length === products.length;

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

        {!loading && products.length > 0 && !selectMode && (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground xl:inline">or ⌘/Ctrl-click any product</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectMode(true)}>
              Select products
            </Button>
          </div>
        )}

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
            <ProductsGridView
              products={products}
              tenantId={tenantId}
              onToggled={handleToggled}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              canReorder={!isFiltered}
              hasMore={hasMore}
              onMove={moveProduct}
              onFlyer={setFlyerProduct}
            />
          ) : (
            <ProductsTableView
              products={products}
              tenantId={tenantId}
              onToggled={handleToggled}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              canReorder={!isFiltered}
              hasMore={hasMore}
              onMove={moveProduct}
              onFlyer={setFlyerProduct}
            />
          )}

          <div ref={sentinelRef} className={`mt-6 flex justify-center ${selectMode ? "pb-24" : ""}`}>
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {!hasMore && (
              <p className="text-xs text-muted-foreground">
                {products.length} product{products.length === 1 ? "" : "s"} — you&apos;ve reached the end.
              </p>
            )}
          </div>
        </>
      )}

      {selectMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Button type="button" variant="ghost" size="icon-sm" onClick={exitSelectMode} aria-label="Exit select mode">
                <X className="h-4 w-4" />
              </Button>
              <p className="truncate text-sm font-medium">
                {selectedIds.size === 0 ? "Select products" : `${selectedIds.size} selected`}
              </p>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelectedIds(allSelected ? new Set() : new Set(products.map((p) => p.id)))
                }
              >
                {allSelected ? "Clear all" : "Select all"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => setBulkEditOpen(true)}
                className="gap-1.5"
              >
                <PencilLine className="h-4 w-4" />
                Edit {selectedIds.size > 0 ? selectedIds.size : ""} product{selectedIds.size === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BulkEditProductsDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        products={selectedProducts}
        tenantId={tenantId}
        onSaved={(saved) => {
          saved.forEach((p) => {
            const current = products.find((c) => c.id === p.id);
            updateProductInList(current ? { ...current, ...p } : p);
          });
          exitSelectMode();
        }}
      />

      <Dialog open={flyerProduct !== null} onOpenChange={(open) => !open && setFlyerProduct(null)}>
        <DialogContent className="max-h-[90vh] sm:max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{flyerProduct ? `${productName(flyerProduct)} — flyer` : "Flyer"}</DialogTitle>
          </DialogHeader>
          {flyerProduct && <ProductFlyerManager tenant={tenant} product={flyerProduct} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
