"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/format";
import {
  addAffiliateCollectionItem,
  getAffiliateListings,
  getCollection,
  getIncomingAffiliates,
  removeAffiliateCollectionItem,
} from "@/lib/api";
import type { AffiliateListing } from "@/lib/types";

interface ResellableItem {
  relationshipId: string;
  ownerName: string;
  listing: AffiliateListing;
}

// A native Collection's `productIds` can only ever point at this tenant's
// own products (see CollectionsService) — placing a product you resell
// from another shop into one of your own collections instead goes through
// AffiliateCollectionItem, a completely separate mechanism tied to your
// own AffiliateProductListing. ProductPicker/CollectionForm only ever
// deals with the native side, so this is a self-contained sibling section
// for the other one, following the same shape as AffiliateVisibilityManager.
export function AffiliateCollectionItemsManager({
  tenantId,
  collectionId,
}: {
  tenantId: string;
  collectionId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ResellableItem[]>([]);
  const [memberListingIds, setMemberListingIds] = useState<Set<string>>(new Set());
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [relationships, collection] = await Promise.all([
          getIncomingAffiliates(tenantId),
          getCollection(collectionId, tenantId, true),
        ]);
        const active = relationships.filter((r) => r.status === "ACTIVE");
        const listingsByRelationship = await Promise.all(
          active.map((r) => getAffiliateListings(r.id, tenantId)),
        );
        if (cancelled) return;

        const resellable: ResellableItem[] = [];
        active.forEach((relationship, i) => {
          for (const listing of listingsByRelationship[i]) {
            // Only what's actually showing on this shop's own storefront —
            // adding a listing the vendor has hidden would just add an
            // invisible item to the collection.
            if (listing.isActive && listing.product) {
              resellable.push({
                relationshipId: relationship.id,
                ownerName: relationship.ownerTenant?.name ?? "Unknown shop",
                listing,
              });
            }
          }
        });
        setItems(resellable);
        setMemberListingIds(
          new Set(
            collection.products
              .map((p) => p.affiliateSource?.listingId)
              .filter((id): id is string => Boolean(id)),
          ),
        );
      } catch {
        // Leaves the section empty — nothing to resell, or the fetch
        // failed; either way there's nothing useful to show here.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, collectionId]);

  async function toggle(item: ResellableItem) {
    const inCollection = memberListingIds.has(item.listing.id);
    setPendingListingId(item.listing.id);
    try {
      if (inCollection) {
        await removeAffiliateCollectionItem(
          item.relationshipId,
          tenantId,
          collectionId,
          item.listing.productId,
        );
      } else {
        await addAffiliateCollectionItem(
          item.relationshipId,
          tenantId,
          collectionId,
          item.listing.productId,
        );
      }
      setMemberListingIds((prev) => {
        const next = new Set(prev);
        if (inCollection) next.delete(item.listing.id);
        else next.add(item.listing.id);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this product.");
    } finally {
      setPendingListingId(null);
    }
  }

  if (loading || items.length === 0) return null;

  const byOwner = new Map<string, ResellableItem[]>();
  for (const item of items) {
    const list = byOwner.get(item.ownerName) ?? [];
    list.push(item);
    byOwner.set(item.ownerName, list);
  }

  return (
    <div className="mt-12 max-w-3xl border-t pt-8">
      <h2 className="text-lg font-semibold">Products you resell</h2>
      <p className="text-sm text-muted-foreground">
        Add products from shops you&apos;re an affiliate for into this collection too.
      </p>
      <div className="mt-4 flex flex-col gap-5">
        {[...byOwner.entries()].map(([ownerName, ownerItems]) => (
          <div key={ownerName}>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {ownerName}
            </p>
            <div className="flex flex-col divide-y rounded-lg border">
              {ownerItems.map((item) => {
                const checked = memberListingIds.has(item.listing.id);
                const pending = pendingListingId === item.listing.id;
                return (
                  <label key={item.listing.id} className="flex items-center gap-2.5 p-2.5 text-sm">
                    <Checkbox checked={checked} disabled={pending} onCheckedChange={() => toggle(item)} />
                    <span className="flex-1 truncate">{item.listing.product?.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatMoney(item.listing.effectivePrice)}
                    </span>
                    {pending && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
