"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GalleryPicker } from "@/components/admin/gallery-picker";
import { TagInput } from "@/components/admin/tag-input";
import { ProductPicker } from "@/components/admin/product-picker";
import { AffiliateCollectionItemsManager } from "@/components/admin/affiliate-collection-items-manager";
import {
  CollectionItemsOrderList,
  collectionItemKey,
} from "@/components/admin/collection-items-order-list";
import {
  addAffiliateCollectionItem,
  createCollection,
  deleteCollection,
  removeAffiliateCollectionItem,
  updateCollection,
} from "@/lib/api";
import { THEME_PRESETS, THEME_TEMPLATE_META } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";
import type {
  AffiliateListing,
  AffiliateRelationship,
  CollectionItemRef,
  CollectionWithProducts,
  DepositType,
  Product,
  ThemeTemplate,
} from "@/lib/types";

export function CollectionForm({
  tenantId,
  collection,
  defaultPreorder = false,
  onSaved,
  floatingSubmit = false,
}: {
  tenantId: string;
  collection?: CollectionWithProducts;
  /** Pre-checks the "Pre-order collection" toggle for new collections started from the Pre-orders section. */
  defaultPreorder?: boolean;
  /** When provided, called instead of navigating to the collections list on success. */
  onSaved?: (saved: CollectionWithProducts) => void;
  /** Pins Save/Delete to the bottom of the viewport instead of the form's
   * own flow — for the full edit page, where Flyer/Feed/affiliate-item
   * sections below can make the page long enough that the button would
   * otherwise be a long scroll away. Left off in the quick-create dialog,
   * whose own bounded scroll area doesn't have that problem. */
  floatingSubmit?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(collection?.title ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [seoTitle, setSeoTitle] = useState(collection?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(collection?.seoDescription ?? "");
  // Everything in the collection, in storefront order — the tenant's own
  // products and resold ones (affiliateSource set) together, so the vendor
  // can interleave them. The edit page fetches the collection with
  // includeAffiliate for exactly this. Only own products become
  // `productIds`; resold ones are added/removed through the affiliate API
  // on save, and both kinds' positions are sent as `itemOrder`.
  const [items, setItems] = useState<Product[]>(() => collection?.products ?? []);
  const [initialListingIds] = useState(
    () =>
      new Set(
        (collection?.products ?? []).flatMap((p) =>
          p.affiliateSource ? [p.affiliateSource.listingId] : [],
        ),
      ),
  );
  const selectedProductIds = useMemo(
    () => new Set(items.filter((p) => !p.affiliateSource).map((p) => p.id)),
    [items],
  );
  const memberListingIds = useMemo(
    () => new Set(items.flatMap((p) => (p.affiliateSource ? [p.affiliateSource.listingId] : []))),
    [items],
  );
  const [tags, setTags] = useState<string[]>(collection?.tags ?? []);
  const [coverImage, setCoverImage] = useState<string[]>(
    collection?.coverImage ? [collection.coverImage] : [],
  );
  const [themeChoice, setThemeChoice] = useState<ThemeTemplate | "none">(
    collection?.themeOverride?.template ?? "none",
  );
  const [isPreorder, setIsPreorder] = useState(
    collection ? collection.type === "PREORDER" : defaultPreorder,
  );
  const [depositType, setDepositType] = useState<DepositType>(
    collection?.depositType ?? "PERCENTAGE",
  );
  const [depositPercentage, setDepositPercentage] = useState(
    collection?.depositPercentage ?? 50,
  );
  const [fulfillmentNote, setFulfillmentNote] = useState(collection?.fulfillmentNote ?? "");
  const [isActive, setIsActive] = useState(collection?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  function handleToggleProduct(product: Product) {
    setItems((prev) =>
      prev.some((p) => !p.affiliateSource && p.id === product.id)
        ? prev.filter((p) => p.affiliateSource || p.id !== product.id)
        : [...prev, product],
    );
  }

  function handleToggleResold(relationship: AffiliateRelationship, listing: AffiliateListing) {
    if (!listing.product) return;
    const key = `listing:${listing.id}`;
    setItems((prev) =>
      prev.some((p) => collectionItemKey(p) === key)
        ? prev.filter((p) => collectionItemKey(p) !== key)
        : [
            ...prev,
            {
              ...listing.product!,
              price: listing.effectivePrice,
              affiliateSource: {
                listingId: listing.id,
                relationshipId: relationship.id,
                ownerTenantId: listing.ownerTenant.id,
                ownerTenantName: listing.ownerTenant.name,
              },
            },
          ],
    );
  }

  function handleRemoveItem(product: Product) {
    const key = collectionItemKey(product);
    setItems((prev) => prev.filter((p) => collectionItemKey(p) !== key));
  }

  function handleMoveItem(key: string, direction: "up" | "down") {
    setItems((prev) => {
      const index = prev.findIndex((p) => collectionItemKey(p) === key);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // Replays resold-product membership changes against the affiliate API —
  // they live in AffiliateCollectionItem, not the collection's own
  // productIds. Returns how many of the calls failed.
  async function syncResoldItems(collectionId: string) {
    const current = items.filter((p) => p.affiliateSource);
    const added = current.filter((p) => !initialListingIds.has(p.affiliateSource!.listingId));
    const currentIds = new Set(current.map((p) => p.affiliateSource!.listingId));
    const removed = (collection?.products ?? []).filter(
      (p) => p.affiliateSource && !currentIds.has(p.affiliateSource.listingId),
    );
    const results = await Promise.allSettled([
      ...added.map((p) =>
        addAffiliateCollectionItem(p.affiliateSource!.relationshipId, tenantId, collectionId, p.id),
      ),
      ...removed.map((p) =>
        removeAffiliateCollectionItem(p.affiliateSource!.relationshipId, tenantId, collectionId, p.id),
      ),
    ]);
    return {
      changed: added.length + removed.length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title,
      description,
      seoTitle,
      seoDescription,
      productIds: Array.from(selectedProductIds),
      tags,
      coverImage: coverImage[0] ?? "",
      themeOverride: themeChoice === "none" ? null : THEME_PRESETS[themeChoice],
      type: isPreorder ? ("PREORDER" as const) : ("STANDARD" as const),
      depositType: isPreorder ? depositType : null,
      depositPercentage: isPreorder && depositType === "PERCENTAGE" ? depositPercentage : null,
      fulfillmentNote: isPreorder ? fulfillmentNote : "",
      isActive,
    };
    const itemOrder: CollectionItemRef[] = items.map((p) =>
      p.affiliateSource ? { listingId: p.affiliateSource.listingId } : { productId: p.id },
    );
    try {
      let saved: CollectionWithProducts;
      let resold: { changed: number; failed: number };
      if (collection) {
        // Resold items first, so the ones just added exist by the time
        // itemOrder sets their positions.
        resold = await syncResoldItems(collection.id);
        saved = await updateCollection(collection.id, tenantId, { ...payload, itemOrder });
      } else {
        saved = await createCollection(tenantId, { ...payload, itemOrder });
        resold = await syncResoldItems(saved.id);
        // Newly added resold items land at the end — one more pass to put
        // them where they were placed in the list.
        if (resold.changed > resold.failed) {
          saved = await updateCollection(saved.id, tenantId, {
            productIds: payload.productIds,
            itemOrder,
          });
        }
      }
      if (resold.failed > 0) {
        toast.error(
          `${collection ? "Collection saved" : "Collection created"}, but ${resold.failed} resold product change${resold.failed === 1 ? "" : "s"} didn't go through — check the collection's edit page.`,
        );
      }
      toast.success(collection ? "Collection updated" : "Collection created");
      if (onSaved) {
        onSaved(saved);
      } else if (collection) {
        router.push("/admin/collections");
      } else {
        // New collection, no custom onSaved handler (i.e. the standalone
        // /admin/collections/new page, not the quick-create dialog) —
        // land on its own edit page, where flyer/feed sections that only
        // make sense for an existing collection live.
        router.push(`/admin/collections/${saved.id}`);
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!collection) return;
    await deleteCollection(collection.id, tenantId);
    toast.success("Collection deleted");
    router.push("/admin/collections");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div>
        <Label>Cover image</Label>
        <div className="mt-1.5">
          <GalleryPicker
            tenantId={tenantId}
            selected={coverImage}
            onChange={(urls) => setCoverImage(urls.slice(-1))}
            max={1}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>Tags</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Helps you find this collection later — search by tag in the collections list.
        </p>
        <div className="mt-1.5">
          <TagInput tags={tags} onChange={setTags} placeholder="Add a tag…" />
        </div>
      </div>

      <div>
        <Label>Products in this collection</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the arrows to set the order they appear in on your storefront.
        </p>
        <div className="mt-2">
          <CollectionItemsOrderList
            items={items}
            onMove={handleMoveItem}
            onRemove={handleRemoveItem}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Add your products</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Not-live products can&apos;t be newly added — turn a product live first.
        </p>
        <div className="mt-2">
          <ProductPicker
            tenantId={tenantId}
            selectedIds={selectedProductIds}
            onToggle={handleToggleProduct}
          />
        </div>
      </div>

      <AffiliateCollectionItemsManager
        tenantId={tenantId}
        memberListingIds={memberListingIds}
        onToggle={handleToggleResold}
      />

      <div className="rounded-lg border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={isPreorder} onCheckedChange={(v) => setIsPreorder(v === true)} />
          Pre-order collection
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Products added here go on pre-order: customers pay a deposit or the
          full amount up front, and the rest (if any) once you tell them it&apos;s ready.
        </p>
        {isPreorder && (
          <div className="mt-4 flex flex-col gap-4 border-t pt-4">
            <div>
              <Label>Customer pays</Label>
              <Select value={depositType} onValueChange={(v) => setDepositType(v as DepositType)}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">A deposit (percentage) now</SelectItem>
                  <SelectItem value="FULL">The full amount now</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {depositType === "PERCENTAGE" && (
              <div>
                <Label htmlFor="depositPercentage">Deposit percentage</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    id="depositPercentage"
                    type="number"
                    min={1}
                    max={99}
                    value={depositPercentage}
                    onChange={(e) => setDepositPercentage(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">% of the order total, due when you confirm it</span>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="fulfillmentNote">Fulfillment note</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Shown to customers so they know what to expect, e.g. &quot;Hand-woven to order. Ready in 4-6 weeks.&quot;
              </p>
              <Input
                id="fulfillmentNote"
                value={fulfillmentNote}
                onChange={(e) => setFulfillmentNote(e.target.value)}
                placeholder="Ready in 4-6 weeks"
                className="mt-1.5"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <Label>Theme override</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Give this collection its own look, independent of the main store theme.
        </p>
        <Select value={themeChoice} onValueChange={(v) => setThemeChoice(v as ThemeTemplate | "none")}>
          <SelectTrigger className="mt-2 w-full">
            <SelectValue placeholder="Inherit store theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Inherit store theme</SelectItem>
            {(Object.keys(THEME_TEMPLATE_META) as ThemeTemplate[]).map((key) => (
              <SelectItem key={key} value={key}>
                {THEME_TEMPLATE_META[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="seoTitle">SEO title</Label>
          <Input id="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="seoDescription">SEO description</Label>
          <Input
            id="seoDescription"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} className="mt-0.5" />
        <div>
          <Label>Live</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When off, this collection is hidden from your storefront&apos;s homepage and
            collections list. Direct links to it still work.
          </p>
        </div>
      </div>

      <div
        className={cn(
          floatingSubmit &&
            "fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.06)]",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3",
            floatingSubmit ? "mx-auto max-w-3xl px-4 py-3 sm:px-6" : "pt-2",
          )}
          style={
            floatingSubmit
              ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }
              : undefined
          }
        >
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : collection ? "Save changes" : "Create collection"}
          </Button>
          {collection && (
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
