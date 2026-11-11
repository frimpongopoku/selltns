"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ProductThumb } from "@/components/admin/product-picker";
import { formatMoney } from "@/lib/format";
import { getIncomingAffiliates } from "@/lib/api";
import { useAffiliateListingLibrary } from "@/lib/use-affiliate-listing-library";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { AffiliateListing, AffiliateRelationship } from "@/lib/types";

import { productName } from "@/lib/product-name";
// A native Collection's `productIds` can only ever point at this tenant's
// own products (see CollectionsService) — placing a product you resell
// from another shop into one of your own collections instead goes through
// AffiliateCollectionItem, a completely separate mechanism tied to your
// own AffiliateProductListing.
//
// This is only the picker half: membership is owned by CollectionForm,
// which shows both kinds of item in one ordered list and replays the
// add/remove calls on save (creating or editing alike), so a resold
// product can be positioned anywhere among the collection's own ones.
//
// Each owner you resell for gets its own search-and-paginate picker (see
// useAffiliateListingLibrary / OwnerResellableList below) — same
// server-side cursor pagination as ProductPicker, so a catalog running
// into the thousands never gets loaded into the page all at once.
// The shops this tenant actively resells for — empty while loading, or when
// there are none (or the fetch failed), which callers treat as "nothing to
// resell".
export function useResellRelationships(tenantId: string): AffiliateRelationship[] {
  const [relationships, setRelationships] = useState<AffiliateRelationship[]>([]);
  useEffect(() => {
    let cancelled = false;
    getIncomingAffiliates(tenantId)
      .then((result) => {
        if (!cancelled) setRelationships(result.filter((r) => r.status === "ACTIVE"));
      })
      .catch(() => {
        // Nothing useful to show either way.
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);
  return relationships;
}

export function AffiliateCollectionItemsManager({
  tenantId,
  relationships,
  memberListingIds,
  onToggle,
}: {
  tenantId: string;
  relationships: AffiliateRelationship[];
  memberListingIds: Set<string>;
  onToggle: (relationship: AffiliateRelationship, listing: AffiliateListing) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {relationships.map((relationship) => (
        <OwnerResellableList
          key={relationship.id}
          tenantId={tenantId}
          relationship={relationship}
          memberListingIds={memberListingIds}
          onToggle={(listing) => onToggle(relationship, listing)}
        />
      ))}
    </div>
  );
}

function OwnerResellableList({
  tenantId,
  relationship,
  memberListingIds,
  onToggle,
}: {
  tenantId: string;
  relationship: AffiliateRelationship;
  memberListingIds: Set<string>;
  onToggle: (listing: AffiliateListing) => void;
}) {
  const { listings, loading, loadingMore, hasMore, loadMore, query, setQuery } =
    useAffiliateListingLibrary(relationship.id, tenantId);
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    enabled: hasMore && !loading,
    root: listEl,
  });

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
              return (
                <label
                  key={listing.id}
                  className="flex items-center gap-2.5 border-b p-2.5 text-sm last:border-b-0"
                >
                  <Checkbox checked={checked} onCheckedChange={() => onToggle(listing)} />
                  {listing.product && <ProductThumb product={listing.product} />}
                  <span className="flex-1 truncate">{listing.product && productName(listing.product)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatMoney(listing.effectivePrice)}
                  </span>
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
