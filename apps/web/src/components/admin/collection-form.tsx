"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GalleryPicker } from "@/components/admin/gallery-picker";
import { createCollection, deleteCollection, updateCollection } from "@/lib/api";
import { THEME_PRESETS, THEME_TEMPLATE_META } from "@/lib/theme-presets";
import type { Collection, Product, ThemeTemplate } from "@/lib/types";

export function CollectionForm({
  tenantId,
  collection,
  products,
}: {
  tenantId: string;
  collection?: Collection;
  products: Product[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(collection?.title ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [seoTitle, setSeoTitle] = useState(collection?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(collection?.seoDescription ?? "");
  const [productIds, setProductIds] = useState<string[]>(collection?.productIds ?? []);
  const [coverImage, setCoverImage] = useState<string[]>(
    collection?.coverImage ? [collection.coverImage] : [],
  );
  const [themeChoice, setThemeChoice] = useState<ThemeTemplate | "none">(
    collection?.themeOverride?.template ?? "none",
  );
  const [saving, setSaving] = useState(false);

  function toggleProduct(id: string) {
    setProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title,
      description,
      seoTitle,
      seoDescription,
      productIds,
      coverImage: coverImage[0] ?? "",
      themeOverride: themeChoice === "none" ? null : THEME_PRESETS[themeChoice],
    };
    try {
      if (collection) {
        await updateCollection(collection.id, tenantId, payload);
        toast.success("Collection updated");
      } else {
        await createCollection(tenantId, payload);
        toast.success("Collection created");
      }
      router.push("/admin/collections");
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
        <Label>Products in this collection</Label>
        {products.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No products yet — add one first, then come back to build this
            collection.
          </p>
        ) : (
        <div className="mt-2 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
          {products.map((product) => (
            <label key={product.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={productIds.includes(product.id)}
                onCheckedChange={() => toggleProduct(product.id)}
              />
              {product.title}
            </label>
          ))}
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
