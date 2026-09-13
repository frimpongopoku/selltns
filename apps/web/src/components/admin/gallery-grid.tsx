"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Download, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { MediaDropzone } from "@/components/admin/media-dropzone";
import { MediaDetailDialog } from "@/components/admin/media-detail-dialog";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { deleteMedia } from "@/lib/api";
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const isFiltered = query.trim() !== "" || dateFrom !== "" || dateTo !== "";

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
  });

  function handleQuickDeleteClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setPendingDeleteId(id);
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setDeleting(true);
    try {
      await deleteMedia(id, tenantId);
      removeAsset(id);
      toast.success("Photo deleted");
      setPendingDeleteId(null);
    } catch {
      toast.error("Couldn't delete photo. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function handleCardClick(asset: MediaAsset) {
    if (selectMode) {
      if (downloadProgress !== null) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(asset.id)) next.delete(asset.id);
        else next.add(asset.id);
        return next;
      });
    } else {
      setSelected(asset);
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
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
          <Button type="button" variant="outline" size="sm" onClick={() => setSelectMode(true)}>
            Select photos
          </Button>
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
                  onClick={() => handleCardClick(asset)}
                  onKeyDown={(e) => e.key === "Enter" && handleCardClick(asset)}
                  style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
                  className="group relative aspect-square animate-in fade-in-0 zoom-in-95 fill-mode-both cursor-pointer overflow-hidden rounded-lg border text-left duration-300"
                >
                  <Image src={asset.thumbUrl} alt={asset.altText} fill sizes="200px" className="object-cover object-top" />
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
                      onClick={(e) => handleQuickDeleteClick(e, asset.id)}
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
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
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

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete this photo?"
        description="This can't be undone — it'll also disappear anywhere it's currently in use (products, collections, story blocks)."
        deleting={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
