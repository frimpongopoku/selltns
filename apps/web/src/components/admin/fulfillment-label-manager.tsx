"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Share2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  downloadFulfillmentLabelPdf,
  downloadFulfillmentLabelPng,
  getFulfillmentLabelPngBlob,
  type LabelTemplate,
} from "@/lib/generate-fulfillment-label";
import type { Tenant } from "@/lib/types";

const TEMPLATES: { id: LabelTemplate; name: string; description: string }[] = [
  { id: "classic", name: "Classic", description: "White card, logo and QR up top, plain write-in lines." },
  { id: "modern", name: "Modern", description: "Bold color band in your shop's theme color, boxed fields." },
];

export function FulfillmentLabelManager({ tenant }: { tenant: Tenant }) {
  const [template, setTemplate] = useState<LabelTemplate>("classic");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFulfillmentLabelPngBlob(tenant, template)
      .then((blob) => {
        if (cancelled) return;
        setError(null);
        setPreviewUrl(URL.createObjectURL(blob));
        const file = new File([blob], `${tenant.slug}-fulfillment-label-${template}.png`, {
          type: "image/png",
        });
        setCanShare(
          typeof navigator.share === "function" && !!navigator.canShare?.({ files: [file] }),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't generate the label.");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id, template]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleDownloadPng() {
    setBusy("png");
    try {
      await downloadFulfillmentLabelPng(tenant, template);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't download the label.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadPdf() {
    setBusy("pdf");
    try {
      await downloadFulfillmentLabelPdf(tenant, template);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the print PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    try {
      const blob = await getFulfillmentLabelPngBlob(tenant, template);
      const file = new File([blob], `${tenant.slug}-fulfillment-label-${template}.png`, {
        type: "image/png",
      });
      await navigator.share({
        files: [file],
        title: `${tenant.name} fulfillment label`,
        text: `Fulfillment label for ${tenant.name}`,
      });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Couldn't open the share sheet.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-3 lg:max-w-xs">
        {TEMPLATES.map((t) => {
          const selected = t.id === template;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
              </div>
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="flex w-full flex-col items-center gap-6 p-6 sm:p-10">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div
            className="flex w-full max-w-[280px] items-center justify-center overflow-hidden rounded-xl border bg-white"
            style={{ aspectRatio: "2 / 3" }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={`${TEMPLATES.find((t) => t.id === template)?.name} fulfillment label preview`}
                className="h-full w-full"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Generating…</p>
            )}
          </div>
        )}

        <div className="flex w-full max-w-sm flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button onClick={handleDownloadPng} disabled={!previewUrl || busy !== null} className="gap-1.5">
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
          Print at actual size (4×6in) and stick it on the package. Fill in the recipient&apos;s
          name, phone, and delivery location by hand before it goes out.
        </p>
      </Card>
    </div>
  );
}
