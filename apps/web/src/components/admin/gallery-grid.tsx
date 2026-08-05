"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Search, X } from "lucide-react";
import { MediaDropzone } from "@/components/admin/media-dropzone";
import { MediaDetailDialog } from "@/components/admin/media-detail-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMedia } from "@/lib/api";
import { formatBytes } from "@/lib/media-constraints";
import { useMediaLibrary } from "@/lib/use-media-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { MediaAsset } from "@/lib/types";

export function GalleryGrid({ tenantId }: { tenantId: string }) {
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
  const isFiltered = query.trim() !== "" || dateFrom !== "" || dateTo !== "";

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
  });

  function handleQuickDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    removeAsset(id);
    deleteMedia(id, tenantId).catch(() => {
      // Rare — if this fails the asset just reappears on next reload.
    });
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
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {assets.map((asset) => (
              <div
                key={asset.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(asset)}
                onKeyDown={(e) => e.key === "Enter" && setSelected(asset)}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border text-left"
              >
                <Image src={asset.thumbUrl} alt={asset.altText} fill sizes="200px" className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 translate-y-full bg-black/60 px-2 py-1 text-[10px] text-white transition-transform group-hover:translate-y-0">
                  <p className="truncate">{asset.title || "Untitled"}</p>
                  <p className="text-white/80">
                    {asset.width}×{asset.height} · {formatBytes(asset.bytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleQuickDelete(e, asset.id)}
                  aria-label="Delete photo"
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
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
    </div>
  );
}
