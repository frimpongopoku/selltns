"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  downloadCollectionFlyerPdf,
  downloadCollectionFlyerPng,
  flyerProductFromProduct,
  getCollectionFlyerPngBlob,
  type FlyerProductInput,
  type RenderFlyerInput,
} from "@/lib/generate-collection-flyer";
import type { CollectionWithProducts, Tenant } from "@/lib/types";

const MAX_PRODUCTS = 6;

export function CollectionFlyerManager({
  tenant,
  collection,
}: {
  tenant: Tenant;
  collection: CollectionWithProducts;
}) {
  const liveProducts = useMemo(
    () => collection.products.filter((p) => p.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [collection.products],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    liveProducts.slice(0, MAX_PRODUCTS).map((p) => p.id),
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);

  const selectedProducts: FlyerProductInput[] = useMemo(
    () =>
      selectedIds
        .map((id) => liveProducts.find((p) => p.id === id))
        .filter((p): p is (typeof liveProducts)[number] => !!p)
        .map(flyerProductFromProduct),
    [selectedIds, liveProducts],
  );

  const input: RenderFlyerInput | null =
    selectedProducts.length > 0
      ? {
          tenant,
          collectionTitle: collection.title,
          collectionSlug: collection.slug,
          themeOverride: collection.themeOverride,
          products: selectedProducts,
        }
      : null;

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    getCollectionFlyerPngBlob(input)
      .then((blob) => {
        if (cancelled) return;
        setError(null);
        setPreviewUrl(URL.createObjectURL(blob));
        const file = new File([blob], `${tenant.slug}-${collection.slug}-flyer.png`, {
          type: "image/png",
        });
        setCanShare(
          typeof navigator.share === "function" && !!navigator.canShare?.({ files: [file] }),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't generate the flyer.");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedIds), tenant.id, collection.id]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function toggleProduct(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PRODUCTS) {
        toast.info(`A flyer fits up to ${MAX_PRODUCTS} products — remove one to add another.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleDownloadPng() {
    if (!input) return;
    setBusy("png");
    try {
      await downloadCollectionFlyerPng(input);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't download the flyer.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadPdf() {
    if (!input) return;
    setBusy("pdf");
    try {
      await downloadCollectionFlyerPdf(input);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    if (!input) return;
    setBusy("share");
    try {
      const blob = await getCollectionFlyerPngBlob(input);
      const file = new File([blob], `${tenant.slug}-${collection.slug}-flyer.png`, {
        type: "image/png",
      });
      await navigator.share({
        files: [file],
        title: `${collection.title} — ${tenant.name}`,
        text: `Check out ${collection.title} from ${tenant.name}`,
      });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Couldn't open the share sheet.");
      }
    } finally {
      setBusy(null);
    }
  }

  if (liveProducts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add some live products to this collection first — the flyer is built from whatever&apos;s
        in it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-2 lg:max-w-xs">
        <p className="text-xs text-muted-foreground">
          Pick up to {MAX_PRODUCTS} products to feature — defaults to the first {MAX_PRODUCTS} in
          this collection&apos;s display order.
        </p>
        <div className="flex flex-col gap-1 rounded-lg border p-1">
          {liveProducts.map((product) => {
            const checked = selectedIds.includes(product.id);
            return (
              <label
                key={product.id}
                className="flex items-center gap-2.5 rounded-md p-2 text-sm hover:bg-muted/50"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleProduct(product.id)} />
                <div
                  className="h-8 w-8 shrink-0 rounded bg-cover bg-top"
                  style={
                    product.images[0]
                      ? { backgroundImage: `url(${product.images[0]})` }
                      : { backgroundColor: "var(--muted)" }
                  }
                />
                <span className="flex-1 truncate">{product.title}</span>
              </label>
            );
          })}
        </div>
      </div>

      <Card className="flex w-full flex-col items-center gap-6 p-6 sm:p-10">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="flex w-full max-w-[320px] min-h-[280px] items-center justify-center overflow-hidden rounded-xl border bg-white">
            {input && previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={`${collection.title} flyer preview`} className="w-full h-auto" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {input ? "Generating…" : "Select at least one product"}
              </p>
            )}
          </div>
        )}

        <div className="flex w-full max-w-sm flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button onClick={handleDownloadPng} disabled={!input || !previewUrl || busy !== null} className="gap-1.5">
            <Download className="h-4 w-4" />
            {busy === "png" ? "Downloading…" : "Download PNG"}
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={!input || !previewUrl || busy !== null}
            variant="outline"
            className="gap-1.5"
          >
            <FileText className="h-4 w-4" />
            {busy === "pdf" ? "Preparing…" : "Download PDF"}
          </Button>
          {canShare && (
            <Button
              onClick={handleShare}
              disabled={!input || !previewUrl || busy !== null}
              variant="outline"
              className="gap-1.5"
            >
              <Share2 className="h-4 w-4" />
              {busy === "share" ? "Sharing…" : "Share"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
