"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Star, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GalleryBrowser } from "@/components/admin/gallery-browser";

export function GalleryPicker({
  tenantId,
  selected,
  onChange,
  max,
  showCover = false,
}: {
  tenantId: string;
  selected: string[];
  onChange: (urls: string[]) => void;
  /** Caps the selection; with 1, picking a photo replaces the current one. */
  max?: number;
  /** Labels the first image "Cover" and lets any other be promoted to it. */
  showCover?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const single = max === 1;

  function makeCover(url: string) {
    onChange([url, ...selected.filter((u) => u !== url)]);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {selected.map((url, i) => (
        <div key={`${url}-${i}`} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
          <Image src={url} alt="" fill sizes="80px" className="object-cover object-top" />
          {showCover && i === 0 && selected.length > 1 && (
            <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white">
              Cover
            </span>
          )}
          {showCover && i > 0 && (
            <button
              type="button"
              onClick={() => makeCover(url)}
              aria-label="Make this the cover photo"
              title="Make cover"
              className="absolute bottom-1 left-1 rounded-full bg-black/60 p-1 text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Star className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onChange(selected.filter((u) => u !== url))}
            aria-label="Remove image"
            className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-20 w-20 flex-col gap-1 text-xs"
      >
        <Plus className="h-4 w-4" />
        {selected.length > 0 ? (single ? "Change" : "Edit") : "Add"}
      </Button>
      <GalleryPickerDialog
        tenantId={tenantId}
        open={open}
        onOpenChange={setOpen}
        selected={selected}
        onChange={onChange}
        max={max}
      />
    </div>
  );
}

// The picker dialog on its own, for callers that want their own trigger.
export function GalleryPickerDialog({
  tenantId,
  open,
  onOpenChange,
  selected,
  onChange,
  max,
  title,
}: {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  title?: string;
}) {
  // Picks are staged in a draft and only applied on "Done", so browsing a big
  // library and changing your mind never half-edits the form underneath.
  const [draft, setDraft] = useState<string[]>(selected);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(selected);
  }

  const single = max === 1;

  function add(url: string) {
    setDraft((prev) => {
      if (prev.includes(url)) return prev;
      if (single) return [url];
      if (max && prev.length >= max) return prev;
      return [...prev, url];
    });
  }

  function toggle(url: string) {
    if (draft.includes(url)) setDraft((prev) => prev.filter((u) => u !== url));
    else add(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90dvh] flex-col gap-3 sm:h-[85vh] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title ?? (single ? "Choose a photo" : "Choose photos")}</DialogTitle>
          <DialogDescription>
            {single
              ? "Pick one photo from your gallery, or upload a new one."
              : "Tap photos in the order you want them — the first one is the cover."}
          </DialogDescription>
        </DialogHeader>

        <GalleryBrowser
          tenantId={tenantId}
          selected={draft}
          onToggle={(asset) => toggle(asset.url)}
          onUploaded={(asset) => add(asset.url)}
          enabled={open}
        />

        <SelectionFooter
          draft={draft}
          max={max}
          onRemove={toggle}
          onClear={single ? undefined : () => setDraft([])}
          onCancel={() => onOpenChange(false)}
          onDone={() => {
            onChange(draft);
            onOpenChange(false);
          }}
          doneLabel={single ? "Use photo" : `Done${draft.length > 0 ? ` (${draft.length})` : ""}`}
          doneDisabled={single && draft.length === 0}
        />
      </DialogContent>
    </Dialog>
  );
}

export function SelectionFooter({
  draft,
  max,
  onRemove,
  onClear,
  onCancel,
  onDone,
  doneLabel,
  doneDisabled = false,
  emptyHint = "Nothing selected yet",
}: {
  draft: string[];
  max?: number;
  onRemove: (url: string) => void;
  /** Omit to hide the "Clear" link. */
  onClear?: () => void;
  onCancel: () => void;
  onDone: () => void;
  doneLabel: string;
  doneDisabled?: boolean;
  emptyHint?: string;
}) {
  return (
    <div className="-mx-4 -mb-4 flex flex-col gap-3 rounded-b-xl border-t bg-muted/50 p-3 sm:flex-row sm:items-center sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {draft.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <>
            <span className="shrink-0 text-sm font-medium">
              {draft.length}
              {max && max > 1 ? ` / ${max}` : ""} selected
            </span>
            <div className="flex min-w-0 gap-1.5 overflow-x-auto py-0.5">
              {draft.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onRemove(url)}
                  aria-label={`Remove photo ${i + 1} from selection`}
                  className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-md border"
                >
                  <Image src={url} alt="" fill sizes="40px" className="object-cover object-top" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <X className="h-3.5 w-3.5 text-white" />
                  </span>
                </button>
              ))}
            </div>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Clear
              </button>
            )}
          </>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onDone}
          disabled={doneDisabled}
          className="flex-1 sm:flex-none"
        >
          {doneLabel}
        </Button>
      </div>
    </div>
  );
}
