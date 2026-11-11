"use client";

import { useCallback, useState } from "react";
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
import { getSheetGallery } from "@/lib/api";
import { assetPosition } from "@/lib/image-focus";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { cn } from "@/lib/utils";
import type { SheetGalleryPhoto } from "@/lib/types";
import { usePaged } from "./use-paged";

// Picks photos for a new product from the shop's gallery. Tap order is
// photo order — the first one is the cover.
export function SheetGalleryPicker({
  token,
  open,
  initial,
  onDone,
  onCancel,
}: {
  token: string;
  open: boolean;
  initial: string[];
  /** The chosen URLs, plus each one's focus position. */
  onDone: (urls: string[], positions: Record<string, string>) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="flex h-[92dvh] flex-col gap-3 sm:h-[85vh] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose photos</DialogTitle>
          <DialogDescription>
            Tap photos in order. The first one is the cover.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PickerBody
            token={token}
            initial={initial}
            onDone={onDone}
            onCancel={onCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({
  token,
  initial,
  onDone,
  onCancel,
}: {
  token: string;
  initial: string[];
  onDone: (urls: string[], positions: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const fetchPage = useCallback(
    (params: { cursor?: string | null; q?: string }) =>
      getSheetGallery(token, params),
    [token],
  );
  const { items, loading, loadingMore, hasMore, loadMore, query, setQuery } =
    usePaged<SheetGalleryPhoto>(fetchPage);
  const [picked, setPicked] = useState<string[]>(initial);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
    root: listEl,
  });

  function toggle(photo: SheetGalleryPhoto) {
    setPositions((prev) => ({ ...prev, [photo.url]: assetPosition(photo) }));
    setPicked((prev) =>
      prev.includes(photo.url)
        ? prev.filter((u) => u !== photo.url)
        : [...prev, photo.url],
    );
  }

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search photos…"
          className="h-11 pl-8 text-base"
        />
      </div>
      <div
        ref={setListEl}
        className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1"
      >
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {query
              ? "No photos match your search."
              : "The gallery has no photos yet."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5">
              {items.map((photo) => {
                const order = picked.indexOf(photo.url);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => toggle(photo)}
                    aria-pressed={order >= 0}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg bg-muted",
                      order >= 0 && "ring-3 ring-foreground ring-inset",
                    )}
                  >
                    <Image
                      src={photo.thumbUrl}
                      alt={photo.title ?? ""}
                      fill
                      sizes="(min-width: 768px) 20vw, 33vw"
                      className="object-cover"
                      style={{ objectPosition: assetPosition(photo) }}
                    />
                    <span
                      className={cn(
                        "absolute top-1.5 left-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold",
                        order >= 0
                          ? "bg-foreground text-background"
                          : "border-2 border-white bg-black/25",
                      )}
                    >
                      {order >= 0 ? order + 1 : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div ref={sentinelRef} className="flex justify-center p-3">
              {loadingMore && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </>
        )}
      </div>
      <div className="-mx-4 -mb-4 flex items-center gap-3 rounded-b-xl border-t bg-muted/50 p-3 sm:px-4">
        <p className="min-w-0 flex-1 text-sm font-medium">
          {picked.length === 0 ? "No photos chosen" : `${picked.length} chosen`}
        </p>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => onDone(picked, positions)}
          className="gap-1.5"
        >
          <Check className="size-4" />
          Done
        </Button>
      </div>
    </>
  );
}
