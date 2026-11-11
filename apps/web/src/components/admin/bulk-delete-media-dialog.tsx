"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { bulkDeleteMedia, getMediaUsage } from "@/lib/api";
import type { MediaAsset, MediaUsage } from "@/lib/types";
import { assetPosition } from "@/lib/image-focus";

function usageLabel(usage: MediaUsage) {
  switch (usage.kind) {
    case "product":
      return { text: `Product: ${usage.title}`, href: `/admin/products/${usage.id}` };
    case "collection":
      return { text: `Collection: ${usage.title}`, href: `/admin/collections/${usage.id}` };
    case "story":
      return { text: "Story page", href: "/admin/configure" };
    case "logo":
      return { text: "Store logo", href: "/admin/configure" };
    case "drop":
      return { text: "Photo drop", href: "/admin/gallery/photo-drop" };
  }
}

// Links to each place a photo is shown, so the vendor can go remove it.
export function MediaUsageList({ usages }: { usages: MediaUsage[] }) {
  return (
    <ul>
      {usages.map((usage, i) => {
        const { text, href } = usageLabel(usage);
        return (
          <li key={i} className="truncate">
            <Link href={href} className="underline underline-offset-2 hover:opacity-80">
              {text}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Confirms deleting a gallery selection. Photos still shown somewhere
// (products, collections, story, logo) are listed and left alone — the
// server skips them too, so this is a heads-up rather than the safeguard.
export function BulkDeleteMediaDialog({
  open,
  onOpenChange,
  assets,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: MediaAsset[];
  onDeleted: (ids: string[]) => void;
}) {
  const [usages, setUsages] = useState<Record<string, MediaUsage[]> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getMediaUsage(assets.map((a) => a.id))
      .then((res) => !cancelled && setUsages(res))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
    // Only re-check when the dialog opens — the selection can't change while it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset on close (not on open) so the next open starts from "checking…".
  function close() {
    setUsages(null);
    setLoadError(false);
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (deleting) return;
    if (next) onOpenChange(true);
    else close();
  }

  const inUse = usages ? assets.filter((a) => (usages[a.id] ?? []).length > 0) : [];
  const deletableCount = usages ? assets.length - inUse.length : 0;

  async function handleConfirm() {
    setDeleting(true);
    try {
      const { deleted, skipped } = await bulkDeleteMedia(assets.map((a) => a.id));
      onDeleted(deleted);
      if (deleted.length > 0) {
        toast.success(deleted.length === 1 ? "Photo deleted" : `${deleted.length} photos deleted`);
      }
      if (skipped.length > 0) {
        toast.info(
          `${skipped.length} photo${skipped.length === 1 ? " is" : "s are"} still in use and ${skipped.length === 1 ? "wasn't" : "weren't"} deleted.`,
        );
      }
      close();
    } catch {
      toast.error("Couldn't delete photos. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Delete {assets.length === 1 ? "this photo" : `${assets.length} photos`}?
          </DialogTitle>
          <DialogDescription>This can&apos;t be undone.</DialogDescription>
        </DialogHeader>

        {usages === null && !loadError && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking where these photos are used…
          </div>
        )}

        {loadError && (
          <p className="text-sm text-destructive">
            Couldn&apos;t check where these photos are used. Close and try again.
          </p>
        )}

        {inUse.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="flex items-start gap-2 font-medium">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {inUse.length === assets.length
                ? inUse.length === 1
                  ? "This photo is in use, so it won't be deleted."
                  : "All of these photos are in use, so none will be deleted."
                : `${inUse.length} of these photos ${inUse.length === 1 ? "is" : "are"} in use and won't be deleted.`}
            </p>
            <p className="mt-1 pl-6 text-xs">
              Remove {inUse.length === 1 ? "it" : "them"} from wherever {inUse.length === 1 ? "it's" : "they're"} used
              first, then delete again.
            </p>
            <ul className="mt-3 space-y-2">
              {inUse.map((asset) => (
                <li key={asset.id} className="flex items-start gap-2.5">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border">
                    <Image
                      src={asset.thumbUrl}
                      alt={asset.altText}
                      fill
                      sizes="40px"
                      className="object-cover"
                      style={{ objectPosition: assetPosition(asset) }}
                    />
                  </div>
                  <div className="min-w-0 text-xs">
                    {asset.title && <p className="truncate font-medium">{asset.title}</p>}
                    <MediaUsageList usages={usages?.[asset.id] ?? []} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting || deletableCount === 0}
            className="gap-1.5"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {usages === null || deletableCount === assets.length
              ? "Delete"
              : `Delete ${deletableCount} photo${deletableCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
