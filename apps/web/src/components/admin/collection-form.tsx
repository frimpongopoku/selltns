"use client";

import { useState } from "react";
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
import {
  AffiliateCollectionItemsManager,
  type StagedAffiliateItem,
} from "@/components/admin/affiliate-collection-items-manager";
import {
  addAffiliateCollectionItem,
  createCollection,
  deleteCollection,
  updateCollection,
} from "@/lib/api";
import { THEME_PRESETS, THEME_TEMPLATE_META } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";
import type {
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
  // Only ever this tenant's own products — an affiliate-resold item (see
  // AffiliateCollectionItemsManager) isn't a valid native `productIds`
  // entry, so it's filtered out here even if a caller ever passes one in.
  const [selectedProducts, setSelectedProducts] = useState<Map<string, Product>>(
    () =>
      new Map(
        (collection?.products ?? []).filter((p) => !p.affiliateSource).map((p) => [p.id, p]),
      ),
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
  // Only relevant while creating — an existing collection's affiliate
  // members are managed by the sibling AffiliateCollectionItemsManager the
  // edit page renders directly (each toggle there is already a live API
  // call, so there's nothing to stage).
  const [stagedAffiliateItems, setStagedAffiliateItems] = useState<StagedAffiliateItem[]>([]);
  const [saving, setSaving] = useState(false);

  function handleToggleProduct(product: Product) {
    setSelectedProducts((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.set(product.id, product);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title,
      description,
      seoTitle,
      seoDescription,
      productIds: Array.from(selectedProducts.keys()),
      tags,
      coverImage: coverImage[0] ?? "",
      themeOverride: themeChoice === "none" ? null : THEME_PRESETS[themeChoice],
      type: isPreorder ? ("PREORDER" as const) : ("STANDARD" as const),
      depositType: isPreorder ? depositType : null,
      depositPercentage: isPreorder && depositType === "PERCENTAGE" ? depositPercentage : null,
      fulfillmentNote: isPreorder ? fulfillmentNote : "",
      isActive,
    };
    try {
      const saved = collection
        ? await updateCollection(collection.id, tenantId, payload)
        : await createCollection(tenantId, payload);
      if (!collection && stagedAffiliateItems.length > 0) {
        const results = await Promise.allSettled(
          stagedAffiliateItems.map((item) =>
            addAffiliateCollectionItem(item.relationshipId, tenantId, saved.id, item.productId),
          ),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.error(
            failed === stagedAffiliateItems.length
              ? "Collection created, but the resold products couldn't be added. Add them from the collection's edit page."
              : `Collection created, but ${failed} resold product${failed === 1 ? "" : "s"} couldn't be added — check the collection's edit page.`,
          );
        }
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
        // make sense for an existing collection live (affiliate items can
        // now be picked during creation too, staged above and replayed
        // once saved.id exists — see stagedAffiliateItems).
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
          Not-live products can&apos;t be newly added — turn a product live first.
        </p>
        <div className="mt-2">
          <ProductPicker tenantId={tenantId} selected={selectedProducts} onToggle={handleToggleProduct} />
        </div>
      </div>

      {!collection && (
        <AffiliateCollectionItemsManager
          tenantId={tenantId}
          collectionId={null}
          stagedItems={stagedAffiliateItems}
          onStagedItemsChange={setStagedAffiliateItems}
          variant="inline"
        />
      )}

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
