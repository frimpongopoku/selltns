"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capLabel, formatMoney } from "@/lib/format";
import { setAffiliateListingPrice, toggleAffiliateListing } from "@/lib/api";
import { useMyAffiliateListings } from "@/lib/use-my-affiliate-listings";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { AffiliateListing, AffiliateRelationship } from "@/lib/types";

export function MyAffiliateListingsManager({
  tenantId,
  relationships,
}: {
  tenantId: string;
  relationships: AffiliateRelationship[];
}) {
  const [shopFilter, setShopFilter] = useState<string | null>(null);
  const {
    listings,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    query,
    setQuery,
    patchListing,
  } = useMyAffiliateListings(tenantId, shopFilter);
  const sentinelRef = useInfiniteScroll({ onIntersect: loadMore, enabled: hasMore && !loading });
  const relationshipById = new Map(relationships.map((r) => [r.id, r]));

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products by title…"
            className="pl-8"
          />
        </div>
        <Select
          value={shopFilter ?? "all"}
          onValueChange={(v) => setShopFilter(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All shops</SelectItem>
            {relationships.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.ownerTenant?.name ?? "Unknown shop"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {query ? "No products match your search." : "Nothing to resell yet."}
        </p>
      ) : (
        <Card className="mt-6 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Owner price</TableHead>
                  <TableHead>Your price</TableHead>
                  <TableHead>Shown on your shop</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <ListingRow
                    key={listing.id}
                    tenantId={tenantId}
                    listing={listing}
                    relationship={relationshipById.get(listing.relationshipId) ?? null}
                    onPatched={(patch) => patchListing(listing.id, patch)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <div ref={sentinelRef} className="flex justify-center p-3">
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </Card>
      )}
    </div>
  );
}

function ListingRow({
  tenantId,
  listing,
  relationship,
  onPatched,
}: {
  tenantId: string;
  listing: AffiliateListing;
  relationship: AffiliateRelationship | null;
  onPatched: (patch: Partial<AffiliateListing>) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [priceInput, setPriceInput] = useState(String(listing.effectivePrice));
  const [savingPrice, setSavingPrice] = useState(false);
  const [togglePending, setTogglePending] = useState(false);

  async function savePrice() {
    const price = Number(priceInput);
    if (!Number.isInteger(price) || price < 0) {
      toast.error("Enter a whole number.");
      return;
    }
    setSavingPrice(true);
    try {
      const updated = await setAffiliateListingPrice(
        listing.relationshipId,
        tenantId,
        listing.productId,
        price,
      );
      onPatched({ effectivePrice: updated.effectivePrice, priceOverride: updated.priceOverride });
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the price.");
    } finally {
      setSavingPrice(false);
    }
  }

  async function toggleShown(checked: boolean) {
    setTogglePending(true);
    try {
      await toggleAffiliateListing(listing.relationshipId, tenantId, listing.productId, checked);
      onPatched({ isActive: checked });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this product.");
    } finally {
      setTogglePending(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <div className="flex max-w-[220px] items-center gap-3">
          <div
            className="h-10 w-10 shrink-0 rounded-md bg-cover bg-top"
            style={
              listing.product?.images[0]
                ? { backgroundImage: `url(${listing.product.images[0]})` }
                : { backgroundColor: "var(--muted)" }
            }
          />
          <span className="truncate">{listing.product?.title ?? "Untitled product"}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{listing.ownerTenant.name}</TableCell>
      <TableCell className="text-muted-foreground">{formatMoney(listing.ownerPrice)}</TableCell>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={listing.ownerPrice}
              max={listing.capCeiling}
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="h-8 w-24"
              autoFocus
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={savingPrice}
              onClick={savePrice}
              aria-label="Save price"
            >
              {savingPrice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={savingPrice}
              onClick={() => {
                setEditing(false);
                setPriceInput(String(listing.effectivePrice));
              }}
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPriceInput(String(listing.effectivePrice));
              setEditing(true);
            }}
            className="gap-1.5 font-semibold"
          >
            {formatMoney(listing.effectivePrice)}
            <Pencil className="h-3 w-3 opacity-70" />
          </Button>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {relationship ? capLabel(relationship.capType, relationship.capValue) : "Capped"} — max{" "}
          {formatMoney(listing.capCeiling)}
        </p>
      </TableCell>
      <TableCell>
        <Switch checked={listing.isActive} disabled={togglePending} onCheckedChange={toggleShown} />
      </TableCell>
    </TableRow>
  );
}
