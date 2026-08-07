"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaDropzone } from "@/components/admin/media-dropzone";
import { useMediaLibrary } from "@/lib/use-media-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { MediaAsset } from "@/lib/types";

export function GalleryPicker({
  tenantId,
  selected,
  onChange,
}: {
  tenantId: string;
  selected: string[];
  onChange: (urls: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const { assets, loading, loadingMore, hasMore, loadMore, query, setQuery, prepend } =
    useMediaLibrary(tenantId, { enabled: open });

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
    root: scrollEl,
  });

  function toggle(url: string) {
    onChange(selected.includes(url) ? selected.filter((u) => u !== url) : [...selected, url]);
  }

  function handleUploaded(asset: MediaAsset) {
    prepend(asset);
    onChange([...selected, asset.url]);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {selected.map((url, i) => (
          <div key={`${url}-${i}`} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
            <Image src={url} alt="" fill sizes="80px" className="object-cover object-top" />
            <button
              type="button"
              onClick={() => toggle(url)}
              aria-label="Remove image"
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ))}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={<Button type="button" variant="outline" className="h-20 w-20 flex-col gap-1 text-xs" />}
          >
            <Plus className="h-4 w-4" />
            Add
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Choose from gallery</DialogTitle>
            </DialogHeader>

            <MediaDropzone tenantId={tenantId} onUploaded={handleUploaded} compact />

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or tag…"
                className="pl-8"
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : assets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {query
                  ? "No photos match your search."
                  : "Your gallery is empty — upload your first photo above."}
              </p>
            ) : (
              <div
                ref={setScrollEl}
                className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4"
              >
                {assets.map((asset) => {
                  const isSelected = selected.includes(asset.url);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => toggle(asset.url)}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all duration-150 hover:opacity-90 active:scale-95 ${
                        isSelected ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <Image src={asset.thumbUrl} alt={asset.altText} fill sizes="150px" className="object-cover object-top" />
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 animate-in zoom-in-50 rounded-full bg-primary p-1 text-primary-foreground duration-150">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
                <div ref={sentinelRef} className="col-span-full flex justify-center py-2">
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
