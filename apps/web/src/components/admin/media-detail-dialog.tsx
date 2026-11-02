"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertTriangle, Copy, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/admin/tag-input";
import { MediaUsageList } from "@/components/admin/bulk-delete-media-dialog";
import { deleteMedia, getMediaUsage, updateMedia } from "@/lib/api";
import { formatBytes } from "@/lib/media-constraints";
import { formatDateTime } from "@/lib/format";
import type { MediaAsset, MediaUsage } from "@/lib/types";

export function MediaDetailDialog({
  asset,
  tenantId,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  asset: MediaAsset | null;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (asset: MediaAsset) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        {asset && (
          <MediaDetailBody
            key={asset.id}
            asset={asset}
            tenantId={tenantId}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MediaDetailBody({
  asset,
  tenantId,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  asset: MediaAsset;
  tenantId: string;
  onOpenChange: (open: boolean) => void;
  onUpdated: (asset: MediaAsset) => void;
  onDeleted: (id: string) => void;
}) {
  // Keyed by asset.id in the parent, so switching assets remounts this with
  // fresh state instead of needing an effect to resync it.
  const [title, setTitle] = useState(asset.title ?? "");
  const [tags, setTags] = useState<string[]>(asset.tags);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // null while checking where the photo is used.
  const [usages, setUsages] = useState<MediaUsage[] | null>(null);

  const dirty = title !== (asset.title ?? "") || tags.join(",") !== asset.tags.join(",");

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateMedia(asset.id, tenantId, { title: title.trim() || null, tags });
      onUpdated(updated);
      toast.success("Photo updated");
    } catch {
      toast.error("Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleStartDelete() {
    setConfirmingDelete(true);
    setUsages(null);
    try {
      const res = await getMediaUsage([asset.id]);
      setUsages(res[asset.id] ?? []);
    } catch {
      toast.error("Couldn't check where this photo is used");
      setConfirmingDelete(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMedia(asset.id, tenantId);
      onDeleted(asset.id);
      onOpenChange(false);
      toast.success("Photo deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete photo");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(asset.url);
    toast.success("URL copied");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Photo details</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
          <Image src={asset.url} alt={asset.altText} fill sizes="400px" className="object-contain" />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="media-title">Name</Label>
            <Input
              id="media-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled photo"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Tags</Label>
            <div className="mt-1.5">
              <TagInput tags={tags} onChange={setTags} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-y-1.5 text-xs text-muted-foreground">
            <dt>Dimensions</dt>
            <dd className="text-right text-foreground">
              {asset.width} × {asset.height}
            </dd>
            <dt>File size</dt>
            <dd className="text-right text-foreground">{formatBytes(asset.bytes)}</dd>
            <dt>Uploaded</dt>
            <dd className="text-right text-foreground">{formatDateTime(asset.createdAt)}</dd>
          </dl>
          <Button type="button" variant="outline" size="sm" onClick={handleCopyUrl} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            Copy URL
          </Button>
        </div>
      </div>

      {confirmingDelete && usages !== null && usages.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="flex items-start gap-2 font-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This photo is in use, so it can&apos;t be deleted.
          </p>
          <p className="mt-1 pl-6 text-xs">Remove it from these places first, then delete again:</p>
          <div className="mt-2 pl-6 text-xs">
            <MediaUsageList usages={usages} />
          </div>
        </div>
      )}

      <DialogFooter className="justify-between sm:justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {usages === null
                ? "Checking where it's used…"
                : usages.length > 0
                  ? "In use — can't delete."
                  : "Delete this photo? Can't be undone."}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting || usages === null || usages.length > 0}
              className="gap-1.5"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, delete
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={handleStartDelete}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
        <Button type="button" onClick={handleSave} disabled={saving || !dirty}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}
