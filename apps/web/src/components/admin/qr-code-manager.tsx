"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  downloadShopQrPdf,
  downloadShopQrPng,
  getShopQrPngBlob,
} from "@/lib/generate-shop-qr";
import type { Tenant } from "@/lib/types";

export function QrCodeManager({ tenant }: { tenant: Tenant }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);

  useEffect(() => {
    let cancelled = false;
    getShopQrPngBlob(tenant)
      .then((blob) => {
        if (cancelled) return;
        setPreviewUrl(URL.createObjectURL(blob));
        // Only offer "Share" once we know the browser can actually share an
        // image file — mostly mobile browsers today.
        const file = new File([blob], `${tenant.slug}-qr-code.png`, { type: "image/png" });
        if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
          setCanShare(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't generate the QR code.");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleDownloadPng() {
    setBusy("png");
    try {
      await downloadShopQrPng(tenant);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't download the QR code.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadPdf() {
    setBusy("pdf");
    try {
      await downloadShopQrPdf(tenant);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the print PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    try {
      const blob = await getShopQrPngBlob(tenant);
      const file = new File([blob], `${tenant.slug}-qr-code.png`, { type: "image/png" });
      await navigator.share({
        files: [file],
        title: `${tenant.name} on Selltns`,
        text: `Scan to shop ${tenant.name}`,
      });
    } catch (err) {
      // AbortError just means the user closed the share sheet — not a failure.
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Couldn't open the share sheet.");
      }
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-6 p-6 sm:p-10">
      <div className="flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border bg-white">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={`QR code for ${tenant.name}`} className="h-full w-full" />
        ) : (
          <p className="text-sm text-muted-foreground">Generating…</p>
        )}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button
          onClick={handleDownloadPng}
          disabled={!previewUrl || busy !== null}
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
          {busy === "pdf" ? "Preparing…" : "Download for print"}
        </Button>
        {canShare && (
          <Button
            onClick={handleShare}
            disabled={!previewUrl || busy !== null}
            variant="outline"
            className="gap-1.5"
          >
            <Share2 className="h-4 w-4" />
            {busy === "share" ? "Sharing…" : "Share"}
          </Button>
        )}
      </div>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Scanning this takes a customer straight to your shop. Print it on packaging, stick it
        in a physical store, or post it on social media.
      </p>
    </Card>
  );
}
