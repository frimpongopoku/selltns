"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Ban, Camera, Check, ChevronLeft, Copy, Layers, Loader2, Plus, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPhotoDrop,
  groupDropItems,
  removeDropItemPhoto,
  removeDropItems,
  setDropItemsUnavailable,
  updateDropItem,
} from "@/lib/api";
import { uploadDropPhoto } from "@/lib/upload";
import { ACCEPTED_IMAGE_INPUT_ACCEPT, isHeicFile, prepareImageFile } from "@/lib/media-constraints";
import { COLOR_PRESETS, SIZE_PRESETS, swatchFor } from "@/lib/drop-options";
import { cn } from "@/lib/utils";
import { PhotoDropHelp } from "./photo-drop-help";
import { ChipGroup } from "./chip-group";
import { assetPosition } from "@/lib/image-focus";
import type { DropItem, DropItemInput, PhotoDropPublic } from "@/lib/types";

import { priceInput, toPesewas } from "@/lib/money";
import { formatMoney } from "@/lib/format";
type Filter = "all" | "needs" | "ready" | "unavailable";

interface Upload {
  key: string;
  file: File;
  previewUrl: string;
  status: "queued" | "uploading" | "error";
  progress: number;
  error?: string;
}

const UPLOAD_CONCURRENCY = 2;
const REFRESH_MS = 20_000;

let uploadSeq = 0;
function newUploadKey() {
  uploadSeq += 1;
  return `upload-${uploadSeq}`;
}

const isReady = (item: DropItem) => item.price !== null && !item.unavailable;
// Unavailable items need no details, so they never count as "needs details".
const needsDetails = (item: DropItem) => item.price === null && !item.unavailable;

// The team's side of Photo Drop: a no-login page, built for phones, where
// photos are dumped in bulk and then given a price, sizes and colors one
// item at a time. Everything stays in the drop until the shop's admin
// reviews it.
export function PhotoDropApp({ token, initial }: { token: string; initial: PhotoDropPublic }) {
  const [items, setItems] = useState<DropItem[]>(initial.items);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectMode, setSelectMode] = useState(false);
  // In pick order — grouping keeps the first pick as the cover.
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<{ queue: string[]; index: number } | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [inactive, setInactive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadsRef = useRef<Upload[]>([]);
  const activeUploads = useRef(0);

  const needs = items.filter(needsDetails);
  const ready = items.filter(isReady);
  const unavailable = items.filter((i) => i.unavailable);
  const visible =
    filter === "all"
      ? items
      : filter === "needs"
        ? needs
        : filter === "ready"
          ? ready
          : unavailable;
  // In select mode, one button marks the picks unavailable — or, when every
  // pick already is, makes them available again.
  const allPickedUnavailable =
    selected.length > 0 && selected.every((id) => items.find((i) => i.id === id)?.unavailable);
  const uploadingCount = uploads.filter((u) => u.status !== "error").length;

  const refresh = useCallback(async () => {
    try {
      const data = await getPhotoDrop(token);
      setItems(data.items);
    } catch {
      setInactive(true);
    }
  }, [token]);

  // Pick up what teammates add, but never while someone is mid-edit.
  useEffect(() => {
    if (selectMode || editor) return;
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh, selectMode, editor]);

  function patchUpload(key: string, patch: Partial<Upload>) {
    uploadsRef.current = uploadsRef.current.map((u) => (u.key === key ? { ...u, ...patch } : u));
    setUploads(uploadsRef.current);
  }

  function dropUpload(key: string) {
    const target = uploadsRef.current.find((u) => u.key === key);
    if (target) URL.revokeObjectURL(target.previewUrl);
    uploadsRef.current = uploadsRef.current.filter((u) => u.key !== key);
    setUploads(uploadsRef.current);
  }

  // Pulls queued uploads until UPLOAD_CONCURRENCY are in flight. Uses a ref
  // for the queue so the workers see uploads added while they run.
  function pump() {
    while (activeUploads.current < UPLOAD_CONCURRENCY) {
      const next = uploadsRef.current.find((u) => u.status === "queued");
      if (!next) return;
      activeUploads.current += 1;
      patchUpload(next.key, { status: "uploading", progress: 0, error: undefined });
      uploadDropPhoto(token, next.file, (progress) => patchUpload(next.key, { progress }))
        .then((item) => {
          setItems((prev) => [item, ...prev]);
          dropUpload(next.key);
        })
        .catch((err: Error) => patchUpload(next.key, { status: "error", error: err.message }))
        .finally(() => {
          activeUploads.current -= 1;
          pump();
        });
    }
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    const heicCount = picked.filter(isHeicFile).length;
    const converting =
      heicCount > 0
        ? toast.loading(heicCount === 1 ? "Preparing iPhone photo…" : `Preparing ${heicCount} iPhone photos…`)
        : undefined;
    // One at a time: decoding several full-size HEICs at once can run a
    // phone out of memory. Each photo starts uploading as soon as it's ready.
    for (const original of picked) {
      const { file, error } = await prepareImageFile(original);
      if (!file) {
        toast.error(error, { description: original.name });
        continue;
      }
      uploadsRef.current = [
        ...uploadsRef.current,
        {
          key: newUploadKey(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "queued",
          progress: 0,
        },
      ];
      setUploads(uploadsRef.current);
      pump();
    }
    if (converting !== undefined) toast.dismiss(converting);
  }

  function retryFailed() {
    uploadsRef.current = uploadsRef.current.map((u) => (u.status === "error" ? { ...u, status: "queued" } : u));
    setUploads(uploadsRef.current);
    pump();
  }

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected([]);
  }

  async function handleGroup() {
    setBusy(true);
    try {
      const merged = await groupDropItems(token, selected);
      const gone = new Set(selected.slice(1));
      setItems((prev) => prev.filter((i) => !gone.has(i.id)).map((i) => (i.id === merged.id ? merged : i)));
      toast.success(`Grouped into one product with ${merged.photos.length} photos`);
      exitSelect();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't group those photos");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnavailable() {
    const next = !allPickedUnavailable;
    setBusy(true);
    try {
      await setDropItemsUnavailable(token, selected, next);
      const picked = new Set(selected);
      setItems((prev) => prev.map((i) => (picked.has(i.id) ? { ...i, unavailable: next } : i)));
      toast.success(
        next
          ? `Marked ${selected.length === 1 ? "1 item" : `${selected.length} items`} unavailable`
          : `${selected.length === 1 ? "1 item is" : `${selected.length} items are`} available again`,
      );
      exitSelect();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't update those items");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await removeDropItems(token, selected);
      const gone = new Set(selected);
      setItems((prev) => prev.filter((i) => !gone.has(i.id)));
      toast.success(selected.length === 1 ? "Removed" : `Removed ${selected.length} items`);
      setConfirmRemove(false);
      exitSelect();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't remove those items");
    } finally {
      setBusy(false);
    }
  }

  function openEditor(startId?: string) {
    if (startId) {
      const queue = visible.map((i) => i.id);
      setEditor({ queue, index: Math.max(0, queue.indexOf(startId)) });
    } else if (needs.length > 0) {
      setEditor({ queue: needs.map((i) => i.id), index: 0 });
    }
  }

  async function saveItem(id: string, input: DropItemInput) {
    const updated = await updateDropItem(token, id, input);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    if (updated.price !== null) setLastPrice(updated.price);
  }

  function advance() {
    if (!editor) return;
    if (editor.index + 1 >= editor.queue.length) {
      setEditor(null);
      toast.success("All done — thanks!");
    } else {
      setEditor({ ...editor, index: editor.index + 1 });
    }
  }

  if (inactive) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-lg font-semibold">This link isn&apos;t active any more</p>
        <p className="max-w-xs text-sm text-muted-foreground">Ask the shop for the new photo drop link.</p>
      </main>
    );
  }

  const editingItem = editor ? items.find((i) => i.id === editor.queue[editor.index]) : undefined;

  return (
    <main className="flex min-h-dvh flex-col overflow-x-clip bg-muted/30">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {selectMode ? (
        <header className="sticky top-0 z-20 border-b bg-background">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-2 py-2 sm:px-4 sm:py-3">
            <Button variant="ghost" size="icon" className="size-11" onClick={exitSelect} aria-label="Stop selecting">
              <X className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{selected.length === 0 ? "Select photos" : `${selected.length} selected`}</p>
              <p className="text-xs text-muted-foreground">Tap photos of the same product to group them</p>
            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-20 border-b bg-background">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              {initial.shop.logoUrl ? (
                <Image
                  src={initial.shop.logoUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-full border object-cover"
                />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                  {initial.shop.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-heading truncate text-lg leading-tight font-semibold">{initial.shop.name}</p>
                <p className="text-xs text-muted-foreground">Photo drop · anyone with this link can add</p>
              </div>
              <div className="sm:hidden">
                <PhotoDropHelp audience="team" shopName={initial.shop.name} trigger="icon" />
              </div>
            </div>
            <div className="hidden sm:block sm:ml-auto">
              <PhotoDropHelp audience="team" shopName={initial.shop.name} trigger="icon" />
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-16 items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/10 text-base font-semibold hover:bg-primary/15 active:bg-primary/20 sm:h-12 sm:px-6"
            >
              <Camera className="size-5" />
              Take or choose photos
            </button>
            {uploads.length > 0 && (
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground sm:basis-full">
                {uploadingCount > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" />
                    Uploading {uploadingCount} photo{uploadingCount === 1 ? "" : "s"}… keep this page open
                  </span>
                ) : (
                  <span className="text-destructive">Some photos didn&apos;t upload</span>
                )}
                {uploads.some((u) => u.status === "error") && (
                  <button type="button" onClick={retryFailed} className="flex items-center gap-1 font-medium text-foreground">
                    <RotateCcw className="size-3.5" />
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {!selectMode && items.length > 0 && (
        <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-2 px-4 pt-3 pb-1 sm:px-6 sm:pt-5">
          {(
            [
              ["all", `All ${items.length}`],
              ["needs", `Needs details ${needs.length}`],
              ["ready", `Ready ${ready.length}`],
              ...(unavailable.length > 0 || filter === "unavailable"
                ? ([["unavailable", `Unavailable ${unavailable.length}`]] as const)
                : []),
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium",
                filter === value ? "border-foreground bg-foreground text-background" : "bg-background",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-32 sm:px-6 sm:pt-3">
        {items.length === 0 && uploads.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 text-center">
            <p className="font-medium">No photos yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Tap “Take or choose photos” to add product photos. You can add prices, sizes and colors after.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
            {!selectMode &&
              filter !== "ready" &&
              uploads.map((u) => (
                <div key={u.key} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <Image src={u.previewUrl} alt="" fill sizes="(min-width: 1024px) 16vw, (min-width: 768px) 20vw, (min-width: 640px) 25vw, 33vw" className="object-cover" unoptimized />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/60 px-3">
                    {u.status === "error" ? (
                      <>
                        <span className="text-center text-[11px] font-semibold text-destructive">Didn&apos;t upload</span>
                        <button
                          type="button"
                          onClick={() => dropUpload(u.key)}
                          className="text-[11px] font-medium underline"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                        <div className="h-full bg-foreground transition-all" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            {visible.map((item) => {
              const pick = selected.indexOf(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (selectMode ? toggleSelected(item.id) : openEditor(item.id))}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-xl bg-muted text-left",
                    pick >= 0 && "ring-3 ring-blue-600 ring-inset",
                  )}
                >
                  {item.photos[0] && (
                    <Image
                      src={item.photos[0].thumbUrl}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 16vw, (min-width: 768px) 20vw, (min-width: 640px) 25vw, 33vw"
                      className={cn("object-cover", item.unavailable && "opacity-45 grayscale")}
                      style={{ objectPosition: assetPosition(item.photos[0]) }}
                    />
                  )}
                  {item.photos.length > 1 && (
                    <span className="absolute top-1.5 right-1.5 flex h-5 items-center gap-0.5 rounded-md bg-black/75 px-1.5 text-[11px] font-semibold text-white">
                      <Copy className="size-3" />
                      {item.photos.length}
                    </span>
                  )}
                  {selectMode ? (
                    <span
                      className={cn(
                        "absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full text-xs font-bold",
                        pick >= 0 ? "bg-blue-600 text-white shadow-[0_0_0_2px_white]" : "border-2 border-white bg-black/25",
                      )}
                    >
                      {pick >= 0 ? pick + 1 : ""}
                    </span>
                  ) : item.unavailable ? (
                    <span className="absolute bottom-1.5 left-1.5 flex h-[22px] items-center gap-1 rounded-md bg-zinc-800 px-1.5 text-[11px] font-bold text-white">
                      <Ban className="size-3" />
                      Unavailable
                    </span>
                  ) : isReady(item) ? (
                    <span className="absolute bottom-1.5 left-1.5 flex h-[22px] items-center rounded-md bg-white px-1.5 text-[11px] font-bold text-green-800">
                      {formatMoney(item.price ?? 0)}
                    </span>
                  ) : (
                    <span className="absolute bottom-1.5 left-1.5 flex h-[22px] items-center rounded-md bg-amber-100 px-1.5 text-[11px] font-bold text-amber-900">
                      Add details
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {(items.length > 0 || selectMode) && (
        <footer
          className="fixed inset-x-0 bottom-0 z-20 border-t bg-background"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-6xl gap-2 px-4 pt-3 sm:justify-end sm:px-6">
            {selectMode ? (
              <>
                <Button
                  variant="outline"
                  className="h-12 gap-1.5 border-red-200 px-4 text-base text-red-700"
                  disabled={selected.length === 0 || busy}
                  onClick={() => setConfirmRemove(true)}
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                  <span className="hidden sm:inline">Remove</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 gap-1.5 px-4 text-base"
                  disabled={selected.length === 0 || busy}
                  onClick={handleUnavailable}
                >
                  {allPickedUnavailable ? <Undo2 className="size-4" /> : <Ban className="size-4" />}
                  {allPickedUnavailable ? "Available" : "Unavailable"}
                </Button>
                <Button className="h-12 flex-1 gap-1.5 text-base sm:flex-none sm:px-8" disabled={selected.length < 2 || busy} onClick={handleGroup}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Layers className="size-4" />}
                  {selected.length < 2 ? "Pick 2+ to group" : "Group"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="h-12 px-5 text-base" onClick={() => setSelectMode(true)}>
                  Select
                </Button>
                <Button className="h-12 flex-1 text-base sm:flex-none sm:px-8" disabled={needs.length === 0} onClick={() => openEditor()}>
                  {needs.length === 0 ? "All items have details" : `Add details · ${needs.length} left`}
                </Button>
              </>
            )}
          </div>
        </footer>
      )}

      {editor && editingItem && (
        <ItemEditor
          key={editingItem.id}
          item={editingItem}
          position={editor.index + 1}
          total={editor.queue.length}
          token={token}
          lastPrice={lastPrice}
          onItemChange={(updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
          onSave={(input) => saveItem(editingItem.id, input)}
          onNext={advance}
          onClose={() => setEditor(null)}
        />
      )}

      <Dialog open={confirmRemove} onOpenChange={(open) => !busy && setConfirmRemove(open)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {selected.length === 1 ? "this item" : `${selected.length} items`}?</DialogTitle>
            <DialogDescription>They&apos;ll be deleted from the photo drop. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={busy} className="gap-1.5">
              {busy && <Loader2 className="size-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Full-screen, one item at a time. Keyed by item id in the parent so each
// item starts with fresh form state.
function ItemEditor({
  item,
  position,
  total,
  token,
  lastPrice,
  onItemChange,
  onSave,
  onNext,
  onClose,
}: {
  item: DropItem;
  position: number;
  total: number;
  token: string;
  lastPrice: number | null;
  onItemChange: (item: DropItem) => void;
  onSave: (input: DropItemInput) => Promise<void>;
  onNext: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [price, setPrice] = useState(priceInput(item.price));
  const [sizes, setSizes] = useState<string[]>(item.sizes);
  const [colors, setColors] = useState<string[]>(item.colors);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [addingPhotos, setAddingPhotos] = useState(0);
  // Removing a photo takes two taps so a stray tap can't lose one.
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  async function addPhotos(list: FileList | null) {
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    setAddingPhotos(picked.length);
    // One at a time, like the main uploader: HEIC decoding is memory-hungry.
    for (const original of picked) {
      const { file, error } = await prepareImageFile(original);
      if (!file) {
        toast.error(error, { description: original.name });
      } else {
        try {
          const updated = await uploadDropPhoto(token, file, undefined, item.id);
          onItemChange(updated);
          setPhotoIndex(updated.photos.length - 1);
        } catch (err) {
          toast.error((err as Error).message || "Couldn't add that photo");
        }
      }
      setAddingPhotos((n) => n - 1);
    }
  }

  async function removePhoto(photoId: string) {
    if (confirmRemove !== photoId) {
      setConfirmRemove(photoId);
      return;
    }
    setRemoving(true);
    try {
      onItemChange(await removeDropItemPhoto(token, item.id, photoId));
      setPhotoIndex(0);
    } catch (err) {
      toast.error((err as Error).message || "Couldn't remove that photo");
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  }

  const sizeOptions = [...SIZE_PRESETS, ...sizes.filter((s) => !SIZE_PRESETS.some((p) => p.toLowerCase() === s.toLowerCase()))];
  const colorOptions = [
    ...COLOR_PRESETS.map((c) => c.label),
    ...colors.filter((c) => !swatchFor(c)),
  ];
  const isLast = position >= total;

  async function save() {
    const trimmed = price.trim();
    const pesewas = trimmed === "" ? null : toPesewas(trimmed);
    if (trimmed !== "" && pesewas === null) {
      toast.error("Enter a price, like 50 or 4.99");
      return;
    }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), price: pesewas, sizes, colors });
      onNext();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't save — try again");
      setSaving(false);
    }
  }

  const photo = item.photos[photoIndex] ?? item.photos[0];

  // Unavailable products need no details: mark and move straight on.
  async function markUnavailable() {
    setSaving(true);
    try {
      await onSave({ unavailable: true });
      toast.success("Marked unavailable");
      onNext();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't update — try again");
      setSaving(false);
    }
  }

  async function markAvailable() {
    setSaving(true);
    try {
      await onSave({ unavailable: false });
    } catch (err) {
      toast.error((err as Error).message || "Couldn't update — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-black/50 sm:p-6">
      <div className="flex w-full flex-1 flex-col overflow-hidden bg-background sm:max-h-[min(880px,92dvh)] sm:max-w-2xl sm:flex-none sm:rounded-2xl sm:shadow-2xl md:max-w-5xl">
        <div className="flex items-center gap-2 px-2 py-2 sm:px-4 sm:py-3">
          <Button variant="ghost" size="icon" className="size-11" onClick={onClose} aria-label="Back to all photos">
            <ChevronLeft className="size-6" />
          </Button>
          <div className="flex flex-1 flex-col gap-1.5 pr-3">
            <span className="text-sm font-semibold">
              Item {position} of {total}
            </span>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${(position / total) * 100}%` }} />
            </div>
          </div>
          {!item.unavailable && (
            <Button variant="outline" className="h-10 shrink-0 gap-1.5" onClick={markUnavailable} disabled={saving}>
              <Ban className="size-4" />
              Unavailable
            </Button>
          )}
        </div>
        {item.unavailable && (
          <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-xl bg-zinc-800 px-3.5 py-2.5 text-sm text-white sm:mx-6">
            <span className="flex items-center gap-2 font-medium">
              <Ban className="size-4 shrink-0" />
              Marked unavailable. No details needed.
            </span>
            <button
              type="button"
              onClick={markAvailable}
              disabled={saving}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold"
            >
              <Undo2 className="size-3.5" />
              Mark available
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4 sm:px-6 md:grid md:grid-cols-2 md:gap-8">
          <input
            ref={addInputRef}
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              void addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2 md:self-start">
            <div className="relative h-[34dvh] min-h-48 flex-1 overflow-hidden rounded-2xl bg-muted md:h-[min(560px,64dvh)]">
              {photo && <Image src={photo.url} alt={title} fill sizes="(min-width: 768px) 480px, 80vw" className="object-contain" />}
              {photo && item.photos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  disabled={removing}
                  className={cn(
                    "absolute top-2 right-2 flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold shadow-sm",
                    confirmRemove === photo.id ? "bg-destructive text-white" : "bg-background/90 text-foreground",
                  )}
                >
                  {removing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  {confirmRemove === photo.id ? "Tap again to remove" : "Remove photo"}
                </button>
              )}
            </div>
            <div className="flex w-14 flex-col gap-1.5 overflow-y-auto">
              {item.photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPhotoIndex(i);
                    setConfirmRemove(null);
                  }}
                  aria-label={`Photo ${i + 1}`}
                  className={cn(
                    "relative aspect-square shrink-0 overflow-hidden rounded-lg bg-muted",
                    i === photoIndex && "ring-2 ring-foreground ring-inset",
                  )}
                >
                  <Image
                    src={p.thumbUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                    style={{ objectPosition: assetPosition(p) }}
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => addInputRef.current?.click()}
                disabled={addingPhotos > 0}
                aria-label="Add more photos of this product"
                className="flex aspect-square shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-muted-foreground/50 text-[10px] font-medium text-muted-foreground"
              >
                {addingPhotos > 0 ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {addingPhotos > 0 ? addingPhotos : "Add"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-5 md:mt-0">
            <div className="flex flex-col gap-2">
              <label htmlFor="drop-price" className="text-sm font-semibold">
                Price
              </label>
              <div className="flex gap-2">
                <div className="flex h-13 min-w-0 flex-1 items-center gap-2 rounded-xl border-[1.5px] border-foreground px-3.5 focus-within:ring-3 focus-within:ring-ring/40">
                  <span className="font-semibold text-muted-foreground">GHS</span>
                  <input
                    id="drop-price"
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="0"
                    className="w-0 min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
                {lastPrice !== null && priceInput(lastPrice) !== price && (
                  <button
                    type="button"
                    onClick={() => setPrice(priceInput(lastPrice))}
                    className="flex h-13 shrink-0 flex-col items-start justify-center rounded-xl border bg-muted px-3 text-sm leading-tight font-semibold"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground">Same as last</span>
                    {formatMoney(lastPrice)}
                  </button>
                )}
              </div>
            </div>

            <ChipGroup
              label="Sizes available"
              options={sizeOptions}
              selected={sizes}
              onChange={setSizes}
              addLabel="Add a size"
            />

            <ChipGroup
              label="Colors"
              options={colorOptions}
              selected={colors}
              onChange={setColors}
              addLabel="Add a color"
              rounded
            />

            <div className="flex flex-col gap-2">
              <label htmlFor="drop-name" className="text-sm font-semibold">
                Name <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="drop-name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Linen wrap dress"
                maxLength={120}
                className="h-12 text-base"
              />
            </div>
          </div>
        </div>

        <div
          className="flex gap-2 border-t px-4 pt-3 sm:justify-end sm:px-6 sm:pb-4"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <Button variant="outline" className="h-13 px-5 text-base sm:h-11" onClick={onNext} disabled={saving}>
            Skip
          </Button>
          <Button className="h-13 flex-1 gap-1.5 text-base sm:h-11 sm:flex-none sm:px-8" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {isLast ? "Save & finish" : "Save & next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
