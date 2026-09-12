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
import { TagInput } from "@/components/admin/tag-input";
import { VideoLinksInput } from "@/components/admin/video-links-input";
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
  onSaved?: (saved: Product) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [onSale, setOnSale] = useState(product?.discountPrice != null);
  const [discountPrice, setDiscountPrice] = useState(
    String(product?.discountPrice ?? ""),
  );
  const [customAffiliatePrice, setCustomAffiliatePrice] = useState(
    product?.affiliatePrice != null,
  );
  const [affiliatePrice, setAffiliatePrice] = useState(
    String(product?.affiliatePrice ?? ""),
  );
  const [sku, setSku] = useState(product?.sku ?? "");
  const [stock, setStock] = useState(String(product?.stock ?? ""));
  const [alwaysInStock, setAlwaysInStock] = useState(!(product?.trackStock ?? true));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [videoUrls, setVideoUrls] = useState<string[]>(product?.videoUrls ?? []);
  const [tags, setTags] = useState<string[]>(product?.tags ?? []);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numericPrice = Number(price) || 0;
    if (onSale) {
      const numericDiscountPrice = Number(discountPrice) || 0;
      if (numericDiscountPrice <= 0 || numericDiscountPrice >= numericPrice) {
        toast.error("Discount price must be a positive number lower than the price");
        return;
      }
    }
    const numericDiscountPrice = onSale ? Number(discountPrice) || 0 : null;
    if (customAffiliatePrice) {
      const numericAffiliatePrice = Number(affiliatePrice) || 0;
      if (numericAffiliatePrice <= 0 || numericAffiliatePrice >= numericPrice) {
        toast.error("Affiliate price must be a positive number lower than the price");
        return;
      }
    }
    const numericAffiliatePrice = customAffiliatePrice ? Number(affiliatePrice) || 0 : null;
    setSaving(true);
    const payload = {
      title,
      description,
      price: numericPrice,
      discountPrice: numericDiscountPrice,
      affiliatePrice: numericAffiliatePrice,
      sku,
      stock: Number(stock) || 0,
      trackStock: !alwaysInStock,
      isActive,
      images,
      videoUrls,
      tags,
    };
    try {
      const saved = product
        ? await updateProduct(product.id, tenantId, payload)
        : await createProduct(tenantId, payload);
      toast.success(product ? "Product updated" : "Product created");
      if (onSaved) {
        onSaved(saved);
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

      <div>
        <Label>Tags</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Helps you find this product later — search by tag in the products list.
        </p>
        <div className="mt-1.5">
          <TagInput tags={tags} onChange={setTags} placeholder="Add a tag…" />
        </div>
      </div>

      <div>
        <Label>Videos</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Add YouTube or TikTok links to show alongside your photos — great for fit,
          styling, or a quick demo.
        </p>
        <div className="mt-1.5">
          <VideoLinksInput videos={videoUrls} onChange={setVideoUrls} />
        </div>
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
        {!alwaysInStock && (
          <div>
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1.5" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        <Switch checked={alwaysInStock} onCheckedChange={setAlwaysInStock} className="mt-0.5" />
        <div>
          <Label>Always in stock</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            For made-to-order or otherwise unlimited items — this product never shows as
            &quot;Out of stock&quot;, no matter the stock count.
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <Switch
            checked={onSale}
            onCheckedChange={(checked) => {
              setOnSale(checked);
              if (!checked) setDiscountPrice("");
            }}
            className="mt-0.5"
          />
          <div>
            <Label>Discount</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Shows the regular price crossed out next to a lower price. Turn off anytime to
              go back to the regular price.
            </p>
          </div>
        </div>
        {onSale && (
          <div className="mt-3 max-w-[180px]">
            <Label htmlFor="discountPrice">Discount price (GHS)</Label>
            <Input
              id="discountPrice"
              type="number"
              required
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
              className="mt-1.5"
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <Switch
            checked={customAffiliatePrice}
            onCheckedChange={(checked) => {
              setCustomAffiliatePrice(checked);
              if (!checked) setAffiliatePrice("");
            }}
            className="mt-0.5"
          />
          <div>
            <Label>Affiliate price</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              What affiliates pay when they resell this — off means they pay your regular
              price.
            </p>
          </div>
        </div>
        {customAffiliatePrice && (
          <div className="mt-3 max-w-[180px]">
            <Label htmlFor="affiliatePrice">Affiliate price (GHS)</Label>
            <Input
              id="affiliatePrice"
              type="number"
              required
              value={affiliatePrice}
              onChange={(e) => setAffiliatePrice(e.target.value)}
              className="mt-1.5"
            />
          </div>
        )}
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
