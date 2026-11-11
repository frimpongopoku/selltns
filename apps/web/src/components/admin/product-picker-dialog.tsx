"use client";

import { useState, type MouseEvent } from "react";
import Image from "next/image";
import { Check, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { discountedPrice } from "@/lib/pricing";
import { productImagePosition } from "@/lib/image-focus";
import { hasName, productName, productNumber } from "@/lib/product-name";
import { useProductLibrary } from "@/lib/use-product-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { Product } from "@/lib/types";

// Picks which of the shop's own products are in a collection, as a photo
// grid in its own dialog — so ticking products never moves anything on the
// page underneath. Picks are staged and only applied on "Done"; Shift-click
// ticks a whole run at once.
export function ProductPickerDialog({
  tenantId,
  open,
  onOpenChange,
  selected,
  onDone,
  title = "Add products",
  pickedLabel = "In collection",
  allowInactive = false,
}: {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The products currently picked (e.g. the shop's own ones in the collection). */
  selected: Product[];
  /** The full new selection, in the order picked (existing ones first). */
  onDone: (products: Product[]) => void;
  title?: string;
  /** Names the "picked" tab and footer count, e.g. "In collection". */
  pickedLabel?: string;
  /** Lets products that aren't live be picked too. */
  allowInactive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] flex-col gap-3 sm:h-[88vh] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Tap products to add or remove them. Shift-click to pick a whole run at once.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the catalog isn't fetched until needed. */}
        {open && (
          <PickerBody
            tenantId={tenantId}
            initial={selected}
            pickedLabel={pickedLabel}
            allowInactive={allowInactive}
            onCancel={() => onOpenChange(false)}
            onDone={(products) => {
              onDone(products);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({
  tenantId,
  initial,
  pickedLabel,
  allowInactive,
  onCancel,
  onDone,
}: {
  tenantId: string;
  initial: Product[];
  pickedLabel: string;
  allowInactive: boolean;
  onCancel: () => void;
  onDone: (products: Product[]) => void;
}) {
  const { products, loading, loadingMore, hasMore, loadMore, query, setQuery } =
    useProductLibrary(tenantId);
  const [draft, setDraft] = useState<Product[]>(initial);
  const [showPicked, setShowPicked] = useState(false);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading && !showPicked,
    root: listEl,
  });

  const pickedIds = new Set(draft.map((p) => p.id));
  const initialIds = new Set(initial.map((p) => p.id));
  const added = draft.filter((p) => !initialIds.has(p.id)).length;
  const removed = initial.filter((p) => !pickedIds.has(p.id)).length;
  // Products that aren't live can't be newly added — but ones already in
  // the collection can still be taken out.
  const canPick = (p: Product) => allowInactive || p.isActive || pickedIds.has(p.id);
  const shown = showPicked ? draft : products;

  function toggle(product: Product, e: MouseEvent) {
    const index = shown.findIndex((p) => p.id === product.id);
    const anchorIndex = anchorId ? shown.findIndex((p) => p.id === anchorId) : -1;
    if (e.shiftKey && anchorIndex >= 0 && !showPicked) {
      // Range: tick everything between the last tap and this one.
      const [from, to] = anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex];
      const run = shown.slice(from, to + 1).filter((p) => (allowInactive || p.isActive) && !pickedIds.has(p.id));
      setDraft((prev) => [...prev, ...run]);
    } else if (pickedIds.has(product.id)) {
      setDraft((prev) => prev.filter((p) => p.id !== product.id));
    } else if (canPick(product)) {
      setDraft((prev) => [...prev, product]);
    }
    setAnchorId(product.id);
  }

  const changes = [added > 0 && `${added} to add`, removed > 0 && `${removed} to remove`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowPicked(false);
            }}
            placeholder="Search by name, tag or number…"
            className="pl-8"
            autoFocus
          />
        </div>
        <div className="flex shrink-0 rounded-lg border p-0.5 text-sm">
          {[
            { label: "All products", value: false },
            { label: `${pickedLabel} (${draft.length})`, value: true },
          ].map((tab) => (
            <button
              key={String(tab.value)}
              type="button"
              onClick={() => setShowPicked(tab.value)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 whitespace-nowrap transition-colors",
                showPicked === tab.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={setListEl} className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {loading && !showPicked ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : shown.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {showPicked
              ? `Nothing picked yet.`
              : query
                ? "No products match your search."
                : "No products yet."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
              {shown.map((product) => (
                <ProductTile
                  key={product.id}
                  product={product}
                  picked={pickedIds.has(product.id)}
                  disabled={!canPick(product)}
                  onClick={(e) => toggle(product, e)}
                />
              ))}
            </div>
            {!showPicked && (
              <div ref={sentinelRef} className="flex justify-center p-3">
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            )}
          </>
        )}
      </div>

      <div className="-mx-4 -mb-4 flex flex-col gap-3 rounded-b-xl border-t bg-muted/50 p-3 sm:flex-row sm:items-center sm:px-4">
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-medium">
            {draft.length} {pickedLabel.toLowerCase()}
          </span>
          {changes && <span className="text-muted-foreground"> · {changes}</span>}
        </p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="button" onClick={() => onDone(draft)} className="flex-1 sm:flex-none">
            Done
          </Button>
        </div>
      </div>
    </>
  );
}

function ProductTile({
  product,
  picked,
  disabled,
  onClick,
}: {
  product: Product;
  picked: boolean;
  disabled: boolean;
  onClick: (e: MouseEvent) => void;
}) {
  const image = product.images[0];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={picked}
      aria-label={`${picked ? "Remove" : "Add"} ${productName(product)}`}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border text-left transition-colors select-none",
        picked ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/40",
        disabled && "cursor-not-allowed opacity-50 hover:border-border",
      )}
    >
      <div className="relative aspect-square w-full bg-muted">
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1024px) 160px, (min-width: 640px) 25vw, 33vw"
            className="object-cover"
            style={{ objectPosition: productImagePosition(product, image) }}
          />
        )}
        <span
          className={cn(
            "absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full",
            picked ? "bg-foreground text-background" : "border-2 border-white bg-black/25",
          )}
        >
          {picked && <Check className="h-3.5 w-3.5" />}
        </span>
        {!product.isActive && (
          <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
            Not live
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col p-2">
        <span className={cn("truncate text-xs font-medium sm:text-sm", !hasName(product) && "text-muted-foreground")}>
          {hasName(product) ? product.title : productNumber(product)}
        </span>
        <span className="text-xs text-muted-foreground">{formatMoney(discountedPrice(product))}</span>
      </div>
    </button>
  );
}
