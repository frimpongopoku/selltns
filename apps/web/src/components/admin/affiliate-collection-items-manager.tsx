"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import {
  addAffiliateCollectionItem,
  getCollection,
  getIncomingAffiliates,
  removeAffiliateCollectionItem,
} from "@/lib/api";
import { useAffiliateListingLibrary } from "@/lib/use-affiliate-listing-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { AffiliateListing, AffiliateRelationship } from "@/lib/types";

// A native Collection's `productIds` can only ever point at this tenant's
// own products (see CollectionsService) — placing a product you resell
// from another shop into one of your own collections instead goes through
// AffiliateCollectionItem, a completely separate mechanism tied to your
// own AffiliateProductListing. ProductPicker/CollectionForm only ever
// deals with the native side, so this is a self-contained sibling section
// for the other one.
//
// Each owner you resell for gets its own search-and-paginate picker (see
// useAffiliateListingLibrary / OwnerResellableList below) — same
// server-side cursor pagination as ProductPicker, so a catalog running
// into the thousands never gets loaded into the page all at once.
export function AffiliateCollectionItemsManager({
  tenantId,
  collectionId,
}: {
  tenantId: string;
  collectionId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [relationships, setRelationships] = useState<AffiliateRelationship[]>([]);
  const [memberListingIds, setMemberListingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([getIncomingAffiliates(tenantId), getCollection(collectionId, tenantId, true)])
      .then(([relationshipsResult, collection]) => {
        if (cancelled) return;
        setRelationships(relationshipsResult.filter((r) => r.status === "ACTIVE"));
        setMemberListingIds(
          new Set(
            collection.products
              .map((p) => p.affiliateSource?.listingId)
              .filter((id): id is string => Boolean(id)),
          ),
        );
      })
      .catch(() => {
        // Nothing to resell, or the fetch failed — either way there's
        // nothing useful to show here.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, collectionId]);

  function markMember(listingId: string, member: boolean) {
    setMemberListingIds((prev) => {
      const next = new Set(prev);
      if (member) next.add(listingId);
      else next.delete(listingId);
      return next;
    });
  }

  if (loading || relationships.length === 0) return null;

  return (
    <div className="mt-12 max-w-3xl border-t pt-8">
      <h2 className="text-lg font-semibold">Products you resell</h2>
      <p className="text-sm text-muted-foreground">
        Add products from shops you&apos;re an affiliate for into this collection too.
      </p>
      <div className="mt-4 flex flex-col gap-6">
        {relationships.map((relationship) => (
          <OwnerResellableList
            key={relationship.id}
            tenantId={tenantId}
            collectionId={collectionId}
            relationship={relationship}
            memberListingIds={memberListingIds}
            onMemberChange={markMember}
          />
        ))}
      </div>
    </div>
  );
}

function OwnerResellableList({
  tenantId,
  collectionId,
  relationship,
  memberListingIds,
  onMemberChange,
}: {
  tenantId: string;
  collectionId: string;
  relationship: AffiliateRelationship;
  memberListingIds: Set<string>;
  onMemberChange: (listingId: string, member: boolean) => void;
}) {
  const { listings, loading, loadingMore, hasMore, loadMore, query, setQuery } =
    useAffiliateListingLibrary(relationship.id, tenantId);
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);
  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
    root: listEl,
  });

  async function toggle(listing: AffiliateListing) {
    const inCollection = memberListingIds.has(listing.id);
    setPendingListingId(listing.id);
    try {
      if (inCollection) {
        await removeAffiliateCollectionItem(
          relationship.id,
          tenantId,
          collectionId,
          listing.productId,
        );
      } else {
        await addAffiliateCollectionItem(
          relationship.id,
          tenantId,
          collectionId,
          listing.productId,
        );
      }
      onMemberChange(listing.id, !inCollection);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this product.");
    } finally {
      setPendingListingId(null);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {relationship.ownerTenant?.name ?? "Unknown shop"}
      </p>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="pl-8"
        />
      </div>
      <div ref={setListEl} className="mt-2 max-h-72 overflow-y-auto rounded-lg border">
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : listings.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {query ? "No products match your search." : "Nothing to resell here yet."}
          </p>
        ) : (
          <>
            {listings.map((listing) => {
              const checked = memberListingIds.has(listing.id);
              const pending = pendingListingId === listing.id;
              return (
                <label
                  key={listing.id}
                  className="flex items-center gap-2.5 border-b p-2.5 text-sm last:border-b-0"
                >
                  <Checkbox
                    checked={checked}
                    disabled={pending}
                    onCheckedChange={() => toggle(listing)}
                  />
                  <span className="flex-1 truncate">{listing.product?.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatMoney(listing.effectivePrice)}
                  </span>
                  {pending && (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </label>
              );
            })}
            <div ref={sentinelRef} className="flex justify-center p-2">
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
