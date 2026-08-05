"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { GalleryPicker } from "@/components/admin/gallery-picker";
import { createProduct, deleteProduct, updateProduct } from "@/lib/api";
import type { Product } from "@/lib/types";

export function ProductForm({
  tenantId,
  product,
  onSaved,
}: {
  tenantId: string;
  product?: Product;
  /** When provided, called instead of navigating to the products list on success. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [sku, setSku] = useState(product?.sku ?? "");
  const [stock, setStock] = useState(String(product?.stock ?? ""));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title,
      description,
      price: Number(price) || 0,
      sku,
      stock: Number(stock) || 0,
      isActive,
      images,
    };
    try {
      if (product) {
        await updateProduct(product.id, tenantId, payload);
        toast.success("Product updated");
      } else {
        await createProduct(tenantId, payload);
        toast.success("Product created");
      }
      if (onSaved) {
        onSaved();
      } else {
        router.push("/admin/products");
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    await deleteProduct(product.id, tenantId);
    toast.success("Product deleted");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div>
        <Label>Images</Label>
        <div className="mt-1.5">
          <GalleryPicker tenantId={tenantId} selected={images} onChange={setImages} />
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
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="price">Price (GHS)</Label>
          <Input id="price" type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="stock">Stock</Label>
          <Input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1.5" />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} className="mt-0.5" />
        <div>
          <Label>Live</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When off, this product is hidden from your storefront and can&apos;t be added to
            collections.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
        {product && (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
