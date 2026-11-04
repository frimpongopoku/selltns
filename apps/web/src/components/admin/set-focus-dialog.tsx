"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FocusPicker, FocusPresets } from "@/components/admin/focus-picker";
import { setMediaFocus, suggestMediaFocus } from "@/lib/api";
import { assetFocus, positionOf, type Focus } from "@/lib/image-focus";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/types";

const PREVIEW_LIMIT = 24;

// Gives many photos the same focus point — for a batch shot the same way,
// e.g. shoes always at the bottom of a tall photo.
export function SetFocusDialog({
  open,
  onOpenChange,
  assets,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: MediaAsset[];
  onUpdated: (assets: MediaAsset[]) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {open && assets.length > 0 && (
          <SetFocusBody assets={assets} onOpenChange={onOpenChange} onUpdated={onUpdated} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SetFocusBody({
  assets,
  onOpenChange,
  onUpdated,
}: {
  assets: MediaAsset[];
  onOpenChange: (open: boolean) => void;
  onUpdated: (assets: MediaAsset[]) => void;
}) {
  const [sampleId, setSampleId] = useState(assets[0].id);
  const sample = assets.find((a) => a.id === sampleId) ?? assets[0];
  const [focus, setFocus] = useState<Focus | null>(assetFocus(sample));
  const [busy, setBusy] = useState<"save" | "suggest" | null>(null);
  const alreadySet = assets.filter((a) => assetFocus(a) !== null).length;
  const count = assets.length;

  async function handleSave() {
    setBusy("save");
    try {
      await setMediaFocus(
        assets.map((a) => a.id),
        focus,
      );
      onUpdated(assets.map((a) => ({ ...a, focusX: focus?.x ?? null, focusY: focus?.y ?? null })));
      toast.success(focus ? `Focus set on ${count} photo${count === 1 ? "" : "s"}` : "Focus reset");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save the focus");
    } finally {
      setBusy(null);
    }
  }

  // Each photo gets its own suggestion rather than one shared point.
  async function handleSuggestEach() {
    setBusy("suggest");
    try {
      const { updated } = await suggestMediaFocus(assets.map((a) => a.id));
      const byId = new Map(updated.map((u) => [u.id, u]));
      onUpdated(
        assets.map((a) => {
          const u = byId.get(a.id);
          return u ? { ...a, focusX: u.focusX, focusY: u.focusY } : a;
        }),
      );
      toast.success(`Suggested a focus for ${updated.length} photo${updated.length === 1 ? "" : "s"}`);
      onOpenChange(false);
    } catch {
      toast.error("Couldn't suggest focus points");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Set focus for {count === 1 ? "this photo" : `${count} photos`}</DialogTitle>
        <DialogDescription>
          Tap where the product is. That part shows inside the shop&apos;s product cards — the photos themselves are
          never cut.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <FocusPicker
            src={sample.url}
            width={sample.width}
            height={sample.height}
            alt={sample.altText}
            value={focus}
            onChange={setFocus}
          />
          <FocusPresets value={focus} onChange={setFocus} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">How they&apos;ll look in the shop</p>
          {count > 1 && (
            <p className="text-xs text-muted-foreground">Tap a card to set the point on that photo instead.</p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {assets.slice(0, PREVIEW_LIMIT).map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSampleId(asset.id)}
                aria-label={`Use ${asset.title || "this photo"} to set the point`}
                className={cn(
                  "relative aspect-[4/5] overflow-hidden rounded-md border",
                  asset.id === sample.id && "ring-2 ring-primary ring-offset-1",
                )}
              >
                <Image
                  src={asset.thumbUrl}
                  alt=""
                  fill
                  sizes="100px"
                  className="object-cover"
                  style={{ objectPosition: positionOf(focus) }}
                />
              </button>
            ))}
          </div>
          {count > PREVIEW_LIMIT && (
            <p className="text-xs text-muted-foreground">…and {count - PREVIEW_LIMIT} more.</p>
          )}
          {alreadySet > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {alreadySet === count
                ? count === 1
                  ? "This photo already has a focus point — saving replaces it."
                  : "These photos already have focus points — saving replaces them."
                : `${alreadySet} already ${alreadySet === 1 ? "has a focus point" : "have focus points"} — saving replaces ${alreadySet === 1 ? "it" : "them"}.`}
            </p>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={handleSuggestEach}
          disabled={busy !== null}
          className="gap-1.5"
        >
          {busy === "suggest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Suggest for each photo
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy !== null}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={busy !== null} className="gap-1.5">
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
            {focus ? `Apply to ${count === 1 ? "photo" : `all ${count}`}` : `Reset ${count === 1 ? "photo" : `all ${count}`}`}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
