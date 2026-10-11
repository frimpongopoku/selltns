"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronUp, ImagePlus, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaDropzone } from "@/components/admin/media-dropzone";
import { useMediaLibrary } from "@/lib/use-media-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { MediaAsset } from "@/lib/types";

// The searchable, infinitely-scrolling photo grid shared by every "pick from
// gallery" surface. It fills whatever height its parent gives it — the parent
// must be a flex column with a bounded height (e.g. a dialog body) so only the
// grid scrolls, not the toolbar.
export function GalleryBrowser({
  tenantId,
  selected,
  onToggle,
  onUploaded,
  enabled = true,
}: {
  tenantId: string;
  /** Selected URLs, in pick order — tiles show their position in this list. */
  selected: string[];
  onToggle: (asset: MediaAsset) => void;
  /** A freshly uploaded photo; callers usually auto-select it. */
  onUploaded: (asset: MediaAsset) => void;
  enabled?: boolean;
}) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const { assets, loading, loadingMore, hasMore, loadMore, query, setQuery, prepend } =
    useMediaLibrary(tenantId, { enabled });

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
    root: scrollEl,
  });

  const isEmptyLibrary = !loading && assets.length === 0 && !query;
  const uploadOpen = showUpload || isEmptyLibrary;

  function handleUploaded(asset: MediaAsset) {
    prepend(asset);
    onUploaded(asset);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or tag…"
            className="pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {!isEmptyLibrary && (
          <Button
            type="button"
            variant={showUpload ? "secondary" : "outline"}
            onClick={() => setShowUpload((v) => !v)}
            className="shrink-0 gap-1.5"
            aria-expanded={showUpload}
          >
            {showUpload ? <ChevronUp className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
            <span className="hidden sm:inline">{showUpload ? "Hide upload" : "Upload new"}</span>
            <span className="sm:hidden">{showUpload ? "Hide" : "Upload"}</span>
          </Button>
        )}
      </div>

      {/* Hidden rather than unmounted so photos staged for upload survive
          collapsing the panel. */}
      <div className={uploadOpen ? "max-h-[45%] shrink-0 overflow-y-auto" : "hidden"}>
        <MediaDropzone tenantId={tenantId} onUploaded={handleUploaded} compact />
      </div>

      {/* The grid lives inside the scroller rather than being the scroller
          itself — a height-capped grid squeezes its aspect-square rows into
          overlapping slivers once there are more rows than fit. */}
      <div ref={setScrollEl} className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          query && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No photos match &ldquo;{query}&rdquo;.
            </p>
          )
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
            {assets.map((asset) => {
              const position = selected.indexOf(asset.url);
              const isSelected = position !== -1;
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onToggle(asset)}
                  aria-pressed={isSelected}
                  aria-label={asset.title || asset.altText || "Photo"}
                  className={`group relative aspect-square overflow-hidden rounded-lg bg-muted outline-none transition-all duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 ${
                    isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-popover" : ""
                  }`}
                >
                  <Image
                    src={asset.thumbUrl}
                    alt={asset.altText}
                    fill
                    sizes="(min-width: 1024px) 160px, (min-width: 640px) 25vw, 33vw"
                    className={`object-cover object-top transition-transform duration-200 ${
                      isSelected ? "scale-95 rounded-md" : "group-hover:scale-105"
                    }`}
                  />
                  {asset.title && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden truncate bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 text-left text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100 sm:block">
                      {asset.title}
                    </span>
                  )}
                  <span
                    className={`absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[11px] font-semibold transition-all ${
                      isSelected
                        ? "animate-in zoom-in-50 border-primary bg-primary text-primary-foreground"
                        : "border-white/80 bg-black/20 text-transparent opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isSelected ? position + 1 : ""}
                  </span>
                </button>
              );
            })}
            <div ref={sentinelRef} className="col-span-full flex justify-center py-2">
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
