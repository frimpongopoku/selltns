"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCollectionTags } from "@/lib/api";
import { useCollectionLibrary } from "@/lib/use-collection-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { onCollectionCreated } from "@/lib/collection-events";
import { CollectionActiveToggle } from "@/components/admin/collection-active-toggle";
import { CollectionFlyerManager } from "@/components/admin/collection-flyer-manager";
import type { CollectionWithProducts, Tenant } from "@/lib/types";

export function CollectionsExplorer({ tenantId, tenant }: { tenantId: string; tenant: Tenant }) {
  const {
    collections,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    query,
    setQuery,
    tag,
    setTag,
    prepend,
  } = useCollectionLibrary(tenantId);

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [flyerCollection, setFlyerCollection] = useState<CollectionWithProducts | null>(null);

  useEffect(() => {
    getCollectionTags(tenantId).then(setAvailableTags);
  }, [tenantId]);

  useEffect(() => onCollectionCreated(prepend), [prepend]);

  const isFiltered = query.trim() !== "" || tag !== null;

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
  });

  return (
    <div>
      <div className="mt-7 flex flex-wrap items-end gap-3">
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
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-medium">{isFiltered ? "No collections match your search" : "No collections yet"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isFiltered
              ? "Try a different title or tag."
              : "Group related products into a collection — it'll get its own page on your storefront."}
          </p>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection, i) => (
              <div
                key={collection.id}
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                className="animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300"
              >
                <Card className="overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <Link href={`/admin/collections/${collection.id}`} className="block">
                    <div className="relative aspect-video overflow-hidden">
                      <div
                        className="h-full w-full bg-cover bg-top transition-transform duration-300 hover:scale-105"
                        style={{ backgroundImage: `url(${collection.coverImage})` }}
                      />
                      {collection.type === "PREORDER" && (
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-amber-500/90 px-2 py-0.5 text-[11px] font-medium text-white">
                          Pre-order
                        </span>
                      )}
                      {!collection.isActive && (
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                          Not live
                        </span>
                      )}
                    </div>
                    <div className="p-5 pb-3">
                      <p className="font-medium">{collection.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {collection.products.length} products
                        {collection.type === "PREORDER"
                          ? ` · ${
                              collection.depositType === "FULL"
                                ? "full payment"
                                : `${collection.depositPercentage}% deposit`
                            }`
                          : ""}
                        {collection.themeOverride ? " · custom theme" : ""}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between px-5 pb-4 pt-1">
                    <span className="text-xs text-muted-foreground">
                      {collection.isActive ? "Live" : "Not live"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs"
                        onClick={() => setFlyerCollection(collection)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Flyer
                      </Button>
                      <CollectionActiveToggle
                        collectionId={collection.id}
                        tenantId={tenantId}
                        initialActive={collection.isActive}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          <div ref={sentinelRef} className="mt-6 flex justify-center">
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {!hasMore && (
              <p className="text-xs text-muted-foreground">
                {collections.length} collection{collections.length === 1 ? "" : "s"} — you&apos;ve reached the end.
              </p>
            )}
          </div>
        </>
      )}

      <Dialog open={flyerCollection !== null} onOpenChange={(open) => !open && setFlyerCollection(null)}>
        <DialogContent className="max-h-[90vh] sm:max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{flyerCollection ? `${flyerCollection.title} — flyer` : "Flyer"}</DialogTitle>
          </DialogHeader>
          {flyerCollection && <CollectionFlyerManager tenant={tenant} collection={flyerCollection} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
