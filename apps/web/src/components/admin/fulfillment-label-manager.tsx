"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Share2, Check, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { id: "modern", name: "Modern", description: "Bold color band up top, boxed fields." },
];

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

// Purely a per-device preference (like the template choice above, which also
// isn't saved server-side) — no tenant field for this, so it round-trips
// through localStorage instead of an API call.
function bandColorStorageKey(tenantId: string): string {
  return `fulfillment-label-band-color:${tenantId}`;
}

export function FulfillmentLabelManager({ tenant }: { tenant: Tenant }) {
  const themeColor = tenant.themeTokens?.primary || "#1a1a1a";
  const [template, setTemplate] = useState<LabelTemplate>("classic");
  const [bandColor, setBandColor] = useState(themeColor);
  const [hexDraft, setHexDraft] = useState(themeColor);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(bandColorStorageKey(tenant.id));
      if (saved && HEX_COLOR_PATTERN.test(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBandColor(saved);
        setHexDraft(saved);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — just use the theme color.
    }
  }, [tenant.id]);

  function handleColorChange(color: string) {
    setBandColor(color);
    setHexDraft(color);
    try {
      localStorage.setItem(bandColorStorageKey(tenant.id), color);
    } catch {
      // Ignore — worst case the choice doesn't persist across visits.
    }
  }

  function handleResetColor() {
    handleColorChange(themeColor);
  }

  function commitHexDraft() {
    if (HEX_COLOR_PATTERN.test(hexDraft)) {
      handleColorChange(hexDraft);
    } else {
      setHexDraft(bandColor);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getFulfillmentLabelPngBlob(tenant, template, bandColor)
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
  }, [tenant.id, template, bandColor]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleDownloadPng() {
    setBusy("png");
    try {
      await downloadFulfillmentLabelPng(tenant, template, bandColor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't download the label.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadPdf() {
    setBusy("pdf");
    try {
      await downloadFulfillmentLabelPdf(tenant, template, bandColor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the print PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    try {
      const blob = await getFulfillmentLabelPngBlob(tenant, template, bandColor);
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

        <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Banner color</p>
            {bandColor.toLowerCase() !== themeColor.toLowerCase() && (
              <button
                type="button"
                onClick={handleResetColor}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to theme
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border">
              <input
                type="color"
                value={bandColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="absolute -top-1 -left-1 h-11 w-11 cursor-pointer border-0 p-0"
                aria-label="Banner color"
              />
            </label>
            <Input
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={commitHexDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitHexDraft();
                }
              }}
              className="h-9 font-mono text-sm uppercase"
              maxLength={7}
              aria-label="Banner color hex code"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Defaults to your storefront theme color. Only saved on this device.
          </p>
        </div>
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
