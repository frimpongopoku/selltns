"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Check, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteAffiliate,
  acceptAffiliate,
  declineAffiliate,
  terminateAffiliate,
  getAffiliateEligibleProducts,
  exemptAffiliateProduct,
  unexemptAffiliateProduct,
  getAffiliateListings,
  setAffiliateListingPrice,
  toggleAffiliateListing,
  updateAffiliateDisclosure,
} from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type {
  AffiliateCapType,
  AffiliateEligibleProduct,
  AffiliateListing,
  AffiliateRelationship,
  Tenant,
} from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  DECLINED: "bg-neutral-100 text-neutral-700",
  TERMINATED: "bg-neutral-100 text-neutral-500",
};

function capLabel(capType: AffiliateCapType, capValue: number) {
  return capType === "FIXED" ? `up to ${formatMoney(capValue)} extra` : `up to ${capValue}% extra`;
}

export function AffiliateManager({
  tenant,
  outgoing: initialOutgoing,
  incoming: initialIncoming,
}: {
  tenant: Tenant;
  outgoing: AffiliateRelationship[];
  incoming: AffiliateRelationship[];
}) {
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [disclosureVisible, setDisclosureVisible] = useState(tenant.affiliateDisclosureVisible);
  const [disclosureSaving, setDisclosureSaving] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [capType, setCapType] = useState<AffiliateCapType>("FIXED");
  const [capValue, setCapValue] = useState("");
  const [saving, setSaving] = useState(false);

  const [exemptionsFor, setExemptionsFor] = useState<AffiliateRelationship | null>(null);
  const [listingsFor, setListingsFor] = useState<AffiliateRelationship | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<{
    rel: AffiliateRelationship;
    side: "outgoing" | "incoming";
  } | null>(null);

  async function handleDisclosureToggle(visible: boolean) {
    setDisclosureVisible(visible);
    setDisclosureSaving(true);
    try {
      await updateAffiliateDisclosure(tenant.id, visible);
    } catch (err) {
      setDisclosureVisible(!visible);
      toast.error(err instanceof Error ? err.message : "Couldn't update this setting.");
    } finally {
      setDisclosureSaving(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const rel = await inviteAffiliate(tenant.id, {
        affiliateSlug: slug.trim(),
        capType,
        capValue: Number(capValue),
      });
      setOutgoing((prev) => [rel, ...prev.filter((r) => r.id !== rel.id)]);
      toast.success(`Invite sent to ${slug}`);
      setInviteOpen(false);
      setSlug("");
      setCapValue("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the invite.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAccept(rel: AffiliateRelationship) {
    try {
      const updated = await acceptAffiliate(rel.id, tenant.id);
      setIncoming((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success("Affiliate relationship accepted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't accept the invite.");
    }
  }

  async function handleDecline(rel: AffiliateRelationship) {
    try {
      const updated = await declineAffiliate(rel.id, tenant.id);
      setIncoming((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't decline the invite.");
    }
  }

  async function confirmTerminate() {
    if (!terminateTarget) return;
    const { rel, side } = terminateTarget;
    try {
      const updated = await terminateAffiliate(rel.id, tenant.id);
      if (side === "outgoing") {
        setOutgoing((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        setIncoming((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
      toast.success("Affiliate relationship ended");
      setTerminateTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't end the relationship.");
    }
  }

  return (
    <>
      <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Show affiliate relationships publicly</p>
          <p className="text-xs text-muted-foreground">
            When on, your storefront footer lists which shops you resell for and which shops
            resell your products. Turn this off to keep those relationships private.
          </p>
        </div>
        <Switch
          checked={disclosureVisible}
          disabled={disclosureSaving}
          onCheckedChange={handleDisclosureToggle}
          className="shrink-0"
        />
      </Card>

      <Tabs defaultValue="outgoing">
        <TabsList className="h-auto flex-wrap gap-y-1.5">
          <TabsTrigger value="outgoing">Your affiliates</TabsTrigger>
          <TabsTrigger value="incoming">Shops you resell for</TabsTrigger>
        </TabsList>

        <TabsContent value="outgoing">
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Invite another shop to resell your products, under a price cap you set. Your
              price always stays the source of truth.
            </p>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger render={<Button className="shrink-0 gap-1.5" />}>
                <Plus className="h-4 w-4" />
                Invite affiliate
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite an affiliate</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInvite} className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="aff-slug">Shop URL (slug)</Label>
                    <Input
                      id="aff-slug"
                      required
                      placeholder="glambyrose"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Markup cap</Label>
                    <div className="mt-1.5 flex gap-2">
                      <Select value={capType} onValueChange={(v) => setCapType(v as AffiliateCapType)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED">Fixed (GHS)</SelectItem>
                          <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        required
                        placeholder={capType === "FIXED" ? "e.g. 100" : "e.g. 50"}
                        value={capValue}
                        onChange={(e) => setCapValue(e.target.value)}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      The most this affiliate can add on top of your price
                      {capType === "FIXED" ? " (a flat GHS amount)." : " (a percentage)."}
                    </p>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Sending…" : "Send invite"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {outgoing.length === 0 && (
              <p className="text-sm text-muted-foreground">No affiliates yet.</p>
            )}
            {outgoing.map((rel) => (
              <Card
                key={rel.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{rel.affiliateTenant?.name ?? "Unknown shop"}</p>
                  <p className="text-xs text-muted-foreground">{capLabel(rel.capType, rel.capValue)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_STYLES[rel.status]}>{rel.status}</Badge>
                  {rel.status === "PENDING" && (
                    <span className="text-xs text-muted-foreground">Waiting for a response</span>
                  )}
                  {rel.status === "ACTIVE" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setExemptionsFor(rel)}>
                        Manage products
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTerminateTarget({ rel, side: "outgoing" })}
                      >
                        End relationship
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="incoming">
          <div className="mt-6 flex flex-col gap-3">
            {incoming.length === 0 && (
              <p className="text-sm text-muted-foreground">No one has made you an affiliate yet.</p>
            )}
            {incoming.map((rel) => (
              <Card key={rel.id} className="flex flex-col gap-3 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{rel.ownerTenant?.name ?? "Unknown shop"}</p>
                    <p className="text-xs text-muted-foreground">
                      You can resell their products, marked up {capLabel(rel.capType, rel.capValue)}.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={STATUS_STYLES[rel.status]}>{rel.status}</Badge>
                    {rel.status === "PENDING" && (
                      <>
                        <Button size="sm" onClick={() => handleAccept(rel)} className="gap-1.5">
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecline(rel)}
                          className="gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          Decline
                        </Button>
                      </>
                    )}
                    {rel.status === "ACTIVE" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setListingsFor(rel)}>
                          Choose products & set prices
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTerminateTarget({ rel, side: "incoming" })}
                        >
                          End relationship
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {exemptionsFor && (
        <ExemptionsPanel
          tenantId={tenant.id}
          relationship={exemptionsFor}
          onClose={() => setExemptionsFor(null)}
        />
      )}
      {listingsFor && (
        <ListingsPanel
          tenantId={tenant.id}
          relationship={listingsFor}
          onClose={() => setListingsFor(null)}
        />
      )}

      <Dialog open={!!terminateTarget} onOpenChange={(open) => !open && setTerminateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this affiliate relationship?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {terminateTarget?.side === "outgoing"
              ? `${terminateTarget.rel.affiliateTenant?.name ?? "This shop"} will immediately lose access to your products — everywhere they've shown them.`
              : `You'll immediately lose access to ${terminateTarget?.rel.ownerTenant?.name ?? "this shop"}'s products — everywhere you've shown them.`}
            {" "}This can&apos;t be undone, and only works once every order tied to this
            relationship is completed or cancelled.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmTerminate}>
              End relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Owner side: which of my products this affiliate can see. Default is all
// visible; toggling off exempts one. A right-side panel (not a small modal)
// since a shop's full catalog can run into the hundreds — the search box
// keeps a long list navigable without pagination.
function ExemptionsPanel({
  tenantId,
  relationship,
  onClose,
}: {
  tenantId: string;
  relationship: AffiliateRelationship;
  onClose: () => void;
}) {
  const [items, setItems] = useState<AffiliateEligibleProduct[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getAffiliateEligibleProducts(relationship.id, tenantId)
      .then(setItems)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't load products."));
  }, [relationship.id, tenantId]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.product.title.toLowerCase().includes(q));
  }, [items, query]);

  async function toggle(item: AffiliateEligibleProduct) {
    setPending(item.product.id);
    try {
      if (item.exempt) {
        await unexemptAffiliateProduct(relationship.id, tenantId, item.product.id);
      } else {
        await exemptAffiliateProduct(relationship.id, tenantId, item.product.id);
      }
      setItems((prev) =>
        prev?.map((i) =>
          i.product.id === item.product.id ? { ...i, exempt: !i.exempt } : i,
        ) ?? null,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this product.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Products shown to {relationship.affiliateTenant?.name}</SheetTitle>
          <SheetDescription>
            Every product is visible by default — turn one off to hold it back from this
            affiliate.
          </SheetDescription>
        </SheetHeader>
        <div className="relative px-4">
          <Search className="pointer-events-none absolute top-1/2 left-7 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col divide-y overflow-y-auto px-4 pb-4">
          {items === null && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {filtered?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {items?.length === 0 ? "No products yet." : "No products match your search."}
            </p>
          )}
          {filtered?.map((item) => (
            <div key={item.product.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {item.product.title}
                  {item.product.preorder && (
                    <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      Pre-order
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{formatMoney(item.product.price)}</p>
              </div>
              <Switch
                checked={!item.exempt}
                disabled={pending === item.product.id}
                onCheckedChange={() => toggle(item)}
              />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Affiliate side: this shop's listed products, their price editor (capped
// by the relationship's agreed ceiling), and a per-product show/hide
// toggle — this is the affiliate's own version of the same "default all,
// then choose which to show" control, scoped to their own storefront.
function ListingsPanel({
  tenantId,
  relationship,
  onClose,
}: {
  tenantId: string;
  relationship: AffiliateRelationship;
  onClose: () => void;
}) {
  const [items, setItems] = useState<AffiliateListing[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getAffiliateListings(relationship.id, tenantId)
      .then(setItems)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't load products."));
  }, [relationship.id, tenantId]);

  function updateListing(listing: AffiliateListing) {
    setItems((prev) => prev?.map((i) => (i.id === listing.id ? listing : i)) ?? null);
  }

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.product?.title ?? "").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{relationship.ownerTenant?.name}&apos;s products</SheetTitle>
          <SheetDescription>
            Every product is shown on your shop by default, at the owner&apos;s price — turn one
            off to hold it back, or raise its price up to the agreed cap. The owner&apos;s price
            always stays the source of truth and your price moves with it automatically.
          </SheetDescription>
        </SheetHeader>
        <div className="relative px-4">
          <Search className="pointer-events-none absolute top-1/2 left-7 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col divide-y overflow-y-auto px-4 pb-4">
          {items === null && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {filtered?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {items?.length === 0 ? "Nothing listed for you yet." : "No products match your search."}
            </p>
          )}
          {filtered?.map((listing) => (
            <ListingRow
              key={listing.id}
              tenantId={tenantId}
              relationshipId={relationship.id}
              listing={listing}
              onChange={updateListing}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ListingRow({
  tenantId,
  relationshipId,
  listing,
  onChange,
}: {
  tenantId: string;
  relationshipId: string;
  listing: AffiliateListing;
  onChange: (listing: AffiliateListing) => void;
}) {
  const [price, setPrice] = useState(String(listing.effectivePrice));
  const [saving, setSaving] = useState(false);

  async function save() {
    const value = Number(price);
    if (!Number.isFinite(value)) return;
    setSaving(true);
    try {
      const updated = await setAffiliateListingPrice(relationshipId, tenantId, listing.productId, value);
      onChange(updated);
      toast.success("Price updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this price.");
      setPrice(String(listing.effectivePrice));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(isActive: boolean) {
    try {
      await toggleAffiliateListing(relationshipId, tenantId, listing.productId, isActive);
      onChange({ ...listing, isActive });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this product.");
    }
  }

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {listing.product?.title}
          {listing.product?.preorder && (
            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              Pre-order
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Owner price {formatMoney(listing.ownerPrice)} · cap {formatMoney(listing.capCeiling)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={listing.isActive} onCheckedChange={toggleActive} />
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-24"
        />
        <Button size="sm" variant="outline" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
