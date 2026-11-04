"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Crosshair, Download, Inbox, Loader2, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { MediaDropzone } from "@/components/admin/media-dropzone";
import { MediaDetailDialog } from "@/components/admin/media-detail-dialog";
import { BulkDeleteMediaDialog } from "@/components/admin/bulk-delete-media-dialog";
import { SendToDropDialog } from "@/components/admin/send-to-drop-dialog";
import { SetFocusDialog } from "@/components/admin/set-focus-dialog";
import { assetPosition } from "@/lib/image-focus";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/media-constraints";
import { useMediaLibrary } from "@/lib/use-media-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { downloadMediaAssets, galleryZipFilename } from "@/lib/download-media";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/types";

export function GalleryGrid({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const {
    assets,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    query,
    setQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    prepend,
    updateAsset,
    removeAsset,
  } = useMediaLibrary(tenantId);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  // Kept after closing so the dialog doesn't go blank during its exit animation.
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null);
  const [quickDeleteOpen, setQuickDeleteOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sendToDropOpen, setSendToDropOpen] = useState(false);
  const [setFocusOpen, setSetFocusOpen] = useState(false);
  // The last photo picked — where a shift-click range starts.
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const isFiltered = query.trim() !== "" || dateFrom !== "" || dateTo !== "";

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
  });

  function handleQuickDeleteClick(e: React.MouseEvent, asset: MediaAsset) {
    e.stopPropagation();
    setPendingDelete(asset);
    setQuickDeleteOpen(true);
  }

  // ⌘/Ctrl-click picks a photo straight away (entering select mode if
  // needed), so there's no scrolling back up to "Select photos". Shift-click
  // picks everything between the last pick and this one.
  function handleCardClick(asset: MediaAsset, e?: React.MouseEvent | React.KeyboardEvent) {
    if (downloadProgress !== null) return;
    const toggleKey = !!e && (e.metaKey || e.ctrlKey);
    const rangeKey = !!e && e.shiftKey;
    if (!selectMode && !toggleKey && !rangeKey) {
      setSelected(asset);
      return;
    }
    if (!selectMode) setSelectMode(true);

    const anchorIndex = anchorId ? assets.findIndex((a) => a.id === anchorId) : -1;
    if (rangeKey && anchorIndex >= 0) {
      const index = assets.findIndex((a) => a.id === asset.id);
      const [from, to] = anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex];
      const range = assets.slice(from, to + 1).map((a) => a.id);
      setSelectedIds((prev) => new Set([...prev, ...range]));
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(asset.id)) next.delete(asset.id);
        else next.add(asset.id);
        return next;
      });
    }
    setAnchorId(asset.id);
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setAnchorId(null);
  }

  function handleSelectAllToggle() {
    setSelectedIds((prev) =>
      prev.size === assets.length ? new Set() : new Set(assets.map((a) => a.id)),
    );
  }

  async function handleDownload() {
    const chosen = assets.filter((a) => selectedIds.has(a.id));
    if (chosen.length === 0) return;
    setDownloadProgress({ done: 0, total: chosen.length });
    try {
      const { succeeded, failed } = await downloadMediaAssets(
        chosen,
        (done, total) => setDownloadProgress({ done, total }),
        galleryZipFilename(tenantName),
      );
      if (failed === 0) {
        toast.success(succeeded === 1 ? "Photo downloaded" : `${succeeded} photos downloaded`);
      } else if (succeeded === 0) {
        toast.error("Couldn't download these photos. Please try again.");
      } else {
        toast.info(`${succeeded} downloaded — ${failed} couldn't be reached.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't download photos.");
    } finally {
      setDownloadProgress(null);
    }
  }

  return (
    <div>
      <MediaDropzone tenantId={tenantId} onUploaded={prepend} />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label htmlFor="media-search">Search</Label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="media-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or tag…"
              className="pl-8"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="media-from">From</Label>
          <Input
            id="media-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="media-to">To</Label>
          <Input
            id="media-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1.5"
          />
        </div>
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDateFrom("");
              setDateTo("");
            }}
            className="inline-flex items-center gap-1 pb-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
        {!loading && assets.length > 0 && !selectMode && (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground lg:inline">or ⌘/Ctrl-click any photo</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectMode(true)}>
              Select photos
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">{isFiltered ? "No photos match your search" : "No photos yet"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isFiltered
              ? "Try a different name, tag, or date range."
              : "Upload your first photo — it'll be available to pick from everywhere in the admin, including products and collections."}
          </p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
              selectMode && "pb-28",
            )}
          >
            {assets.map((asset, i) => {
              const isSelected = selectedIds.has(asset.id);
              return (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleCardClick(asset, e)}
                  onKeyDown={(e) => e.key === "Enter" && handleCardClick(asset, e)}
                  style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
                  className="group relative aspect-square select-none animate-in fade-in-0 zoom-in-95 fill-mode-both cursor-pointer overflow-hidden rounded-lg border text-left duration-300"
                >
                  <Image
                    src={asset.thumbUrl}
                    alt={asset.altText}
                    fill
                    sizes="200px"
                    className="object-cover"
                    style={{ objectPosition: assetPosition(asset) }}
                  />
                  {selectMode && (
                    <div
                      className={cn(
                        "absolute inset-0 transition-colors",
                        isSelected ? "bg-primary/25" : "bg-black/0 group-hover:bg-black/10",
                      )}
                    />
                  )}
                  {!selectMode && (
                    <div className="absolute inset-x-0 bottom-0 translate-y-full bg-black/60 px-2 py-1 text-[10px] text-white transition-transform group-hover:translate-y-0">
                      <p className="truncate">{asset.title || "Untitled"}</p>
                      <p className="text-white/80">
                        {asset.width}×{asset.height} · {formatBytes(asset.bytes)}
                      </p>
                    </div>
                  )}
                  {selectMode ? (
                    <div
                      className={cn(
                        "absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-white/90 bg-black/30 text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleQuickDeleteClick(e, asset)}
                      aria-label="Delete photo"
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div ref={sentinelRef} className="mt-6 flex justify-center">
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {!hasMore && (
              <p className="text-xs text-muted-foreground">
                {assets.length} photo{assets.length === 1 ? "" : "s"} — you&apos;ve reached the end.
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={downloadProgress !== null}
                onClick={exitSelectMode}
                aria-label="Exit select mode"
              >
                <X className="h-4 w-4" />
              </Button>
              <p className="truncate text-sm font-medium">
                {selectedIds.size === 0 ? "Select photos" : `${selectedIds.size} selected`}
              </p>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={downloadProgress !== null}
                onClick={handleSelectAllToggle}
              >
                {selectedIds.size === assets.length ? "Clear all" : "Select all"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0 || downloadProgress !== null}
                onClick={() => setSendToDropOpen(true)}
                className="gap-1.5"
              >
                <Inbox className="h-4 w-4" />
                <span className="hidden sm:inline">Send to photo drop</span>
                <span className="sm:hidden">Photo drop</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0 || downloadProgress !== null}
                onClick={() => setSetFocusOpen(true)}
                className="gap-1.5"
              >
                <Crosshair className="h-4 w-4" />
                Set focus
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0 || downloadProgress !== null}
                onClick={() => setBulkDeleteOpen(true)}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={selectedIds.size === 0 || downloadProgress !== null}
                onClick={handleDownload}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                {downloadProgress
                  ? `${downloadProgress.done}/${downloadProgress.total}…`
                  : "Download"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SetFocusDialog
        open={setFocusOpen}
        onOpenChange={setSetFocusOpen}
        assets={assets.filter((a) => selectedIds.has(a.id))}
        onUpdated={(updated) => updated.forEach(updateAsset)}
      />

      <MediaDetailDialog
        asset={selected}
        tenantId={tenantId}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        onUpdated={(updated) => {
          updateAsset(updated);
          setSelected(updated);
        }}
        onDeleted={(id) => {
          removeAsset(id);
          setSelected(null);
        }}
      />

      <SendToDropDialog
        key={sendToDropOpen ? "open" : "closed"}
        open={sendToDropOpen}
        onOpenChange={setSendToDropOpen}
        assetIds={assets.filter((a) => selectedIds.has(a.id)).map((a) => a.id)}
        onSent={exitSelectMode}
      />

      <BulkDeleteMediaDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        assets={assets.filter((a) => selectedIds.has(a.id))}
        onDeleted={(ids) => {
          ids.forEach(removeAsset);
          // Keep the in-use photos selected so it's clear what was left behind.
          const remaining = new Set(selectedIds);
          ids.forEach((id) => remaining.delete(id));
          if (remaining.size === 0) exitSelectMode();
          else setSelectedIds(remaining);
        }}
      />

      <BulkDeleteMediaDialog
        open={quickDeleteOpen}
        onOpenChange={setQuickDeleteOpen}
        assets={pendingDelete ? [pendingDelete] : []}
        onDeleted={(ids) => ids.forEach(removeAsset)}
      />
    </div>
  );
}
