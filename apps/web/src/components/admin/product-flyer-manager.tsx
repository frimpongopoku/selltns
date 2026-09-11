"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, FileText, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  downloadProductFlyerPdf,
  downloadProductFlyerPng,
  flyerProductFromProduct,
  getProductFlyerPngBlob,
  type RenderProductFlyerInput,
} from "@/lib/generate-product-flyer";
import { getCanonicalUrl } from "@/lib/canonical";
import type { Product, Tenant } from "@/lib/types";

// The "bold" template is temporarily disabled (see generate-product-flyer.ts)
// pending a design revisit, so there's only one template to pick from right
// now — the picker UI is commented out below rather than deleted.
// const TEMPLATES: { id: ProductFlyerTemplate; name: string; description: string }[] = [
//   { id: "classic", name: "Classic", description: "Clean card layout, logo up top, QR and price up front." },
//   { id: "bold", name: "Bold", description: "Editorial style with organic shapes, a tilted photo, and a script tagline." },
// ];

export function ProductFlyerManager({ tenant, product }: { tenant: Tenant; product: Product }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(product.images[0] ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);
  const productUrl = getCanonicalUrl(tenant, `/products/${product.slug}`);

  const input: RenderProductFlyerInput = useMemo(
    () => ({
      tenant,
      product: flyerProductFromProduct(product, selectedImage),
    }),
    [tenant, product, selectedImage],
  );

  useEffect(() => {
    // `navigator` doesn't exist during SSR, so this can only be known
    // post-mount — computing it during render (even via a lazy useState
    // initializer) would make the client's first render disagree with the
    // server-rendered HTML and trigger a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    let cancelled = false;
    getProductFlyerPngBlob(input)
      .then((blob) => {
        if (cancelled) return;
        setError(null);
        setPreviewUrl(URL.createObjectURL(blob));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't generate the flyer.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleDownloadPng() {
    setBusy("png");
    try {
      await downloadProductFlyerPng(input);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't download the flyer.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadPdf() {
    setBusy("pdf");
    try {
      await downloadProductFlyerPdf(input);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the PDF.");
    } finally {
      setBusy(null);
    }
  }

  // Shares the customer-facing product link, not a standalone image file —
  // see the same call in collection-flyer-manager.tsx for why: a picture
  // with no way to click through isn't useful, and file-sharing is the
  // flakier of the two across browsers/OSes anyway. The rich preview shows
  // up automatically once the link unfurls, using the product's own photo.
  async function handleShare() {
    setBusy("share");
    try {
      await navigator.share({
        title: `${product.title} — ${tenant.name}`,
        text: `Check out ${product.title} from ${tenant.name}`,
        url: productUrl,
      });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error(`Couldn't open the share sheet${err.message ? `: ${err.message}` : ""}.`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(productUrl);
      toast.success("Link copied — paste it anywhere to share this product.");
    } catch {
      toast.error("Couldn't copy the link. Please try again.");
    }
  }

  if (product.images.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a photo to this product first — the flyer needs one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Template picker (Classic vs Bold) is disabled along with the
          "bold" template itself — see the TEMPLATES comment above. */}
      {product.images.length > 1 && (
        <div className="flex w-full flex-col gap-2 lg:max-w-xs">
          <p className="text-xs text-muted-foreground">Pick which photo to feature.</p>
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-3">
            {product.images.map((image, i) => (
              <button
                key={image}
                type="button"
                onClick={() => setSelectedImage(image)}
                aria-label={`Use photo ${i + 1}`}
                className={`aspect-square overflow-hidden rounded-lg border-2 bg-cover bg-top transition-all ${
                  selectedImage === image ? "border-primary" : "border-transparent hover:opacity-80"
                }`}
                style={{ backgroundImage: `url(${image})` }}
              />
            ))}
          </div>
        </div>
      )}

      <Card className="flex w-full flex-col items-center gap-6 p-6 sm:p-10">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="flex w-full max-w-[320px] min-h-[280px] items-center justify-center overflow-hidden rounded-xl border bg-white">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={`${product.title} flyer preview`} className="w-full h-auto" />
            ) : (
              <p className="text-sm text-muted-foreground">Generating…</p>
            )}
          </div>
        )}

        <div className="flex w-full max-w-sm flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button onClick={handleCopyLink} disabled={busy !== null} className="gap-1.5">
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Button
            onClick={handleDownloadPng}
            disabled={!previewUrl || busy !== null}
            variant="outline"
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            {busy === "png" ? "Downloading…" : "Download PNG"}
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={!previewUrl || busy !== null}
            variant="outline"
            className="gap-1.5"
          >
            <FileText className="h-4 w-4" />
            {busy === "pdf" ? "Preparing…" : "Download PDF"}
          </Button>
          {canShare && (
            <Button onClick={handleShare} disabled={busy !== null} variant="outline" className="gap-1.5">
              <Share2 className="h-4 w-4" />
              {busy === "share" ? "Sharing…" : "Share link"}
            </Button>
          )}
        </div>
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          Copy link shares this product&apos;s page — the flyer photo shows automatically when it
          unfurls.
        </p>
      </Card>
    </div>
  );
}
