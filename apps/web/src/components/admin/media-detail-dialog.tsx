"use client";

import { useState } from "react";
import { AlertTriangle, Copy, Loader2, Sparkles, Trash2 } from "lucide-react";
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
import { FocusPicker, FocusPresets, FocusPreview } from "@/components/admin/focus-picker";
import { deleteMedia, getMediaUsage, suggestMediaFocus, updateMedia } from "@/lib/api";
import { assetFocus, type Focus } from "@/lib/image-focus";
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
  const [focus, setFocus] = useState<Focus | null>(assetFocus(asset));
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // null while checking where the photo is used.
  const [usages, setUsages] = useState<MediaUsage[] | null>(null);

  const savedFocus = assetFocus(asset);
  const focusDirty = focus?.x !== savedFocus?.x || focus?.y !== savedFocus?.y;
  const dirty = title !== (asset.title ?? "") || tags.join(",") !== asset.tags.join(",") || focusDirty;

  // Asks the server where the product probably is (it only looks at the
  // photo) and saves that point straight away.
  async function handleSuggest() {
    setSuggesting(true);
    try {
      const { updated } = await suggestMediaFocus([asset.id]);
      const row = updated[0];
      if (!row) throw new Error();
      onUpdated({ ...asset, focusX: row.focusX, focusY: row.focusY });
      setFocus(row.focusX != null && row.focusY != null ? { x: row.focusX, y: row.focusY } : null);
      toast.success(
        row.focusX == null ? "This photo already fits the shop's cards — no focus needed" : "Focus suggested and saved",
      );
    } catch {
      toast.error("Couldn't suggest a focus point");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateMedia(asset.id, tenantId, {
        title: title.trim() || null,
        tags,
        ...(focusDirty && { focus }),
      });
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
        <FocusPicker
          src={asset.url}
          width={asset.width}
          height={asset.height}
          alt={asset.altText}
          value={focus}
          onChange={setFocus}
        />

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

      <section className="rounded-lg border p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-sm font-medium">Photo focus</p>
              <p className="text-xs text-muted-foreground">
                Choose which part shows in the shop&apos;s product cards. Products using this photo update when you
                save.
              </p>
            </div>
            <FocusPresets value={focus} onChange={setFocus} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSuggest}
              disabled={suggesting}
              className="-ml-2 gap-1.5"
            >
              {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Suggest for me
            </Button>
          </div>
          <FocusPreview src={asset.thumbUrl} focus={focus} />
        </div>
      </section>

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
