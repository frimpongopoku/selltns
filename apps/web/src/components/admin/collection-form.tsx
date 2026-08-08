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
import { createCollection, deleteCollection, updateCollection } from "@/lib/api";
import { THEME_PRESETS, THEME_TEMPLATE_META } from "@/lib/theme-presets";
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
}: {
  tenantId: string;
  collection?: CollectionWithProducts;
  /** Pre-checks the "Pre-order collection" toggle for new collections started from the Pre-orders section. */
  defaultPreorder?: boolean;
  /** When provided, called instead of navigating to the collections list on success. */
  onSaved?: (saved: CollectionWithProducts) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(collection?.title ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [seoTitle, setSeoTitle] = useState(collection?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(collection?.seoDescription ?? "");
  const [selectedProducts, setSelectedProducts] = useState<Map<string, Product>>(
    () => new Map((collection?.products ?? []).map((p) => [p.id, p])),
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
      toast.success(collection ? "Collection updated" : "Collection created");
      if (onSaved) {
        onSaved(saved);
      } else {
        router.push("/admin/collections");
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

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : collection ? "Save changes" : "Create collection"}
        </Button>
        {collection && (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
