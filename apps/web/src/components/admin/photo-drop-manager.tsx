"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Ban, Check, Copy, ImagePlus, Layers, Link2, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { ProductBulkCreateDialog, type BulkRowSeed } from "@/components/admin/product-bulk-create-dialog";
import {
  adminRemoveDropItems,
  clearPhotoDrop,
  createProductFromDrop,
  dropItemsToGallery,
  getPhotoDropAdmin,
  regeneratePhotoDropLink,
  setPhotoDropEnabled,
} from "@/lib/api";
import { swatchFor } from "@/lib/drop-options";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { assetPosition } from "@/lib/image-focus";
import type { DropItem, PhotoDropLink } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";
const REFRESH_MS = 30_000;

type Filter = "all" | "ready" | "needs" | "unavailable";

const isReady = (item: DropItem) => item.price !== null && !item.unavailable;
const needsDetails = (item: DropItem) => item.price === null && !item.unavailable;

// Admin side of Photo Drop: share/switch off the team link, review what the
// team dropped, and send items on — into the gallery as-is, or into the Add
// several dialog to become products. Until then nothing here is in the
// gallery.
export function PhotoDropManager({ tenantId }: { tenantId: string }) {
  const [link, setLink] = useState<PhotoDropLink | null>(null);
  const [items, setItems] = useState<DropItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"remove" | "clear" | "regenerate" | null>(null);
  const [seed, setSeed] = useState<{ key: number; rows: BulkRowSeed[] } | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    () =>
      getPhotoDropAdmin()
        .then((data) => {
          setLink({ token: data.token, enabled: data.enabled });
          setItems(data.items);
          // Forget selections for items that left the drop meanwhile.
          const present = new Set(data.items.map((i) => i.id));
          setSelected((prev) => new Set([...prev].filter((id) => present.has(id))));
        })
        .catch(() => toast.error("Couldn't load the photo drop"))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // New drops from the team show up on their own, unless the admin is
  // mid-selection or has a dialog open.
  useEffect(() => {
    if (selected.size > 0 || confirm || creating) return;
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, selected.size, confirm, creating]);

  const readyCount = items.filter(isReady).length;
  const needsCount = items.filter(needsDetails).length;
  const unavailableCount = items.filter((i) => i.unavailable).length;
  const visible =
    filter === "all"
      ? items
      : filter === "ready"
        ? items.filter(isReady)
        : filter === "needs"
          ? items.filter(needsDetails)
          : items.filter((i) => i.unavailable);
  const chosen = items.filter((i) => selected.has(i.id));
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));
  const url = link?.token ? `${SITE_URL}/drop/${link.token}` : null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleToggleLink(enabled: boolean) {
    try {
      setLink(await setPhotoDropEnabled(enabled));
      toast.success(enabled ? "Team link is on" : "Team link is off — it won't open until you turn it back on");
    } catch {
      toast.error("Couldn't change the link");
    }
  }

  async function handleRegenerate() {
    setBusy(true);
    try {
      setLink(await regeneratePhotoDropLink());
      toast.success("New link ready — the old one no longer works");
      setConfirm(null);
    } catch {
      toast.error("Couldn't make a new link");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied — paste it in your team chat");
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const { removed } = await adminRemoveDropItems([...selected]);
      toast.success(removed === 1 ? "Removed 1 item" : `Removed ${removed} items`);
      setSelected(new Set());
      setConfirm(null);
      await load();
    } catch {
      toast.error("Couldn't remove those items");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      const { removed } = await clearPhotoDrop();
      toast.success(`Cleared ${removed} item${removed === 1 ? "" : "s"} from the drop`);
      setSelected(new Set());
      setConfirm(null);
      await load();
    } catch {
      toast.error("Couldn't clear the drop");
    } finally {
      setBusy(false);
    }
  }

  async function handleToGallery() {
    setBusy(true);
    try {
      const { added } = await dropItemsToGallery([...selected]);
      toast.success(`Added ${added} photo${added === 1 ? "" : "s"} to your gallery`);
      setSelected(new Set());
      await load();
    } catch {
      toast.error("Couldn't add those to the gallery");
    } finally {
      setBusy(false);
    }
  }

  function handleCreateProducts() {
    setSeed({
      key: Date.now(),
      rows: chosen.map((item) => ({
        images: item.photos.map((p) => p.url),
        imagePositions: Object.fromEntries(item.photos.map((p) => [p.url, assetPosition(p)])),
        title: item.title,
        price: item.price === null ? "" : String(item.price),
        sizes: item.sizes,
        colors: item.colors,
        dropItemIds: [item.id],
      })),
    });
    setCreating(true);
  }

  return (
    <div className={cn(selected.size > 0 && "pb-28")}>
      <section className="rounded-xl border p-4">
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : !link?.token ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-xl">
              <p className="font-medium">Team link</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Turn it on to get a link your photographers can open on their phones — no login. They drop photos and
                add prices, sizes and colors; you review everything here.
              </p>
            </div>
            <Button onClick={() => handleToggleLink(true)} className="gap-1.5">
              <Link2 className="h-4 w-4" />
              Turn on team link
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-[999_1_320px]">
              <p className="text-sm font-medium">Team link</p>
              <div className="mt-1.5 flex gap-2">
                <div
                  className={cn(
                    "flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border bg-muted/50 px-3 text-sm",
                    !link.enabled && "text-muted-foreground line-through",
                  )}
                >
                  {url}
                </div>
                <Button onClick={handleCopy} disabled={!link.enabled} className="gap-1.5">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                No login needed. Anyone with this link can add, edit and remove photos in this drop.
              </p>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={link.enabled} onCheckedChange={handleToggleLink} />
                {link.enabled ? "Link is on" : "Link is off"}
              </label>
              <Button variant="outline" size="sm" onClick={() => setConfirm("regenerate")}>
                Make a new link
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All ${items.length}`],
              ["ready", `Ready ${readyCount}`],
              ["needs", `Needs details ${needsCount}`],
              ...(unavailableCount > 0 || filter === "unavailable"
                ? ([["unavailable", `Unavailable ${unavailableCount}`]] as const)
                : []),
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "h-8 rounded-full border px-3 text-sm font-medium",
                filter === value ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {visible.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  visible.forEach((i) => (allVisibleSelected ? next.delete(i.id) : next.add(i.id)));
                  return next;
                })
              }
            >
              {allVisibleSelected ? "Unselect all" : "Select all"}
            </Button>
          )}
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirm("clear")}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clean up drop
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">{items.length === 0 ? "The drop is empty" : "Nothing in this filter"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {items.length === 0
              ? "Share the team link — photos your team adds will appear here for you to review."
              : "Try another filter."}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border text-left transition-colors",
                  isSelected ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/40",
                )}
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {item.photos[0] && (
                    <Image
                      src={item.photos[0].thumbUrl}
                      alt={item.title}
                      fill
                      sizes="240px"
                      className={cn("object-cover", item.unavailable && "opacity-45 grayscale")}
                      style={{ objectPosition: assetPosition(item.photos[0]) }}
                    />
                  )}
                  <span
                    className={cn(
                      "absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-md",
                      isSelected ? "bg-foreground text-background" : "border-2 border-white bg-black/25",
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </span>
                  {item.photos.length > 1 && (
                    <span className="absolute top-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {item.photos.length} photos
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2.5">
                  {item.title && <p className="truncate text-sm font-medium">{item.title}</p>}
                  {item.unavailable ? (
                    <span className="flex items-center gap-1 self-start rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      <Ban className="h-3 w-3" />
                      Unavailable
                    </span>
                  ) : isReady(item) ? (
                    <p className="text-sm font-semibold">GHS {item.price}</p>
                  ) : (
                    <span className="self-start rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
                      No price yet
                    </span>
                  )}
                  <p className="truncate text-xs text-muted-foreground">
                    {item.sizes.length > 0 ? item.sizes.join(" · ") : "No sizes"}
                  </p>
                  <div className="mt-auto flex items-center gap-1 pt-1">
                    {item.colors.slice(0, 6).map((c) => (
                      <span
                        key={c}
                        title={c}
                        className="h-3.5 w-3.5 rounded-full bg-muted shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                        style={swatchFor(c) ? { background: swatchFor(c)! } : undefined}
                      />
                    ))}
                    {item.colors.length > 6 && (
                      <span className="text-[11px] text-muted-foreground">+{item.colors.length - 6}</span>
                    )}
                    <span className="ml-auto text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" onClick={() => setSelected(new Set())} aria-label="Clear selection">
                <X className="h-4 w-4" />
              </Button>
              <p className="text-sm font-medium">{selected.size} selected</p>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirm("remove")}
                disabled={busy}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
              <Button variant="outline" size="sm" onClick={handleToGallery} disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Add to gallery only
              </Button>
              <Button size="sm" onClick={handleCreateProducts} disabled={busy} className="gap-1.5">
                <Layers className="h-4 w-4" />
                Create {selected.size} product{selected.size === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {seed && (
        <ProductBulkCreateDialog
          key={seed.key}
          tenantId={tenantId}
          initialRows={seed.rows}
          open={creating}
          onOpenChange={(open) => {
            setCreating(open);
            // Some products may have been created even if others failed.
            if (!open) void load();
          }}
          createRow={(payload, dropItemIds) => createProductFromDrop(dropItemIds, payload)}
          onAllCreated={() => setSelected(new Set())}
        />
      )}

      <ConfirmDeleteDialog
        open={confirm === "remove"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Remove ${selected.size === 1 ? "this item" : `${selected.size} items`}?`}
        description="They'll be deleted from the drop and won't go to your gallery. This can't be undone."
        deleting={busy}
        onConfirm={handleRemove}
      />
      <ConfirmDeleteDialog
        open={confirm === "clear"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Clean up the whole drop?"
        description={`All ${items.length} item${items.length === 1 ? "" : "s"} will be deleted — anything you haven't sent to your gallery or made into a product is lost. This can't be undone.`}
        deleting={busy}
        onConfirm={handleClear}
      />
      <Dialog open={confirm === "regenerate"} onOpenChange={(open) => !busy && !open && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Make a new link?</DialogTitle>
            <DialogDescription>
              The current link stops working straight away — you&apos;ll need to send the new one to your team. Photos
              already in the drop stay.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleRegenerate} disabled={busy} className="gap-1.5">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Make new link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
