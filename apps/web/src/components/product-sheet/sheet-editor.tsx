"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ImagePlus,
  Loader2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChipGroup } from "@/components/photo-drop/chip-group";
import { COLOR_PRESETS, SIZE_PRESETS, swatchFor } from "@/lib/drop-options";
import { DEFAULT_POSITION } from "@/lib/image-focus";
import { formatMoney } from "@/lib/format";
import { toPesewas } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { SheetChanges, SheetProduct } from "@/lib/types";
import { changesOf, type SheetForm } from "./sheet-form";

// One product, full-screen on phones and a large panel on desktop. Used for
// suggesting edits to a live product (`live` set: changed fields show what's
// live now) and for new products (`onPickPhotos` set: photos come from the
// shop's gallery).
export function SheetEditor({
  heading,
  progress,
  initial,
  live,
  positions,
  onPickPhotos,
  onSave,
  onUndo,
  onDelete,
  onSkip,
  onClose,
  saveLabel,
}: {
  heading: string;
  /** 0–1, for the bar under the heading when stepping through a list. */
  progress?: number;
  initial: SheetForm;
  live?: SheetProduct;
  /** Photo URL → CSS object-position. */
  positions: Record<string, string>;
  /** New products: opens the gallery to choose photos, returns the new list. */
  onPickPhotos?: (current: string[]) => Promise<string[] | null>;
  onSave: (changes: SheetChanges) => Promise<void>;
  /** Shown when there's a suggestion to take back. */
  onUndo?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onSkip?: () => void;
  onClose: () => void;
  saveLabel: string;
}) {
  const [form, setForm] = useState<SheetForm>(initial);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [busy, setBusy] = useState<"save" | "undo" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const patch = (next: Partial<SheetForm>) =>
    setForm((prev) => ({ ...prev, ...next }));

  const images = form.images;
  const photo = images[photoIndex] ?? images[0];
  const sizeOptions = [
    ...SIZE_PRESETS,
    ...form.sizes.filter(
      (s) => !SIZE_PRESETS.some((p) => p.toLowerCase() === s.toLowerCase()),
    ),
  ];
  const colorOptions = [
    ...COLOR_PRESETS.map((c) => c.label),
    ...form.colors.filter((c) => !swatchFor(c)),
  ];

  async function run(
    kind: "save" | "undo" | "delete",
    action: () => Promise<void>,
  ) {
    setBusy(kind);
    try {
      await action();
    } catch (err) {
      toast.error((err as Error).message || "Couldn't save — try again");
    } finally {
      setBusy(null);
    }
  }

  function save() {
    const { changes, error } = changesOf(form, !!onPickPhotos);
    if (error || !changes) {
      toast.error(error);
      return;
    }
    void run("save", () => onSave(changes));
  }

  async function pickPhotos() {
    if (!onPickPhotos) return;
    const next = await onPickPhotos(form.images);
    if (next) {
      patch({ images: next });
      setPhotoIndex(0);
    }
  }

  // "Live: GH₵420" under a field the team has changed.
  const was = (changed: boolean, value: ReactNode) =>
    live && changed ? (
      <p className="text-xs text-amber-700 dark:text-amber-400">
        Changed · live now: <span className="font-medium">{value}</span>
      </p>
    ) : null;
  const liveSale =
    live?.discountPrice != null ? formatMoney(live.discountPrice) : "no sale";

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-black/50 sm:p-6">
      <div className="flex w-full flex-1 flex-col overflow-hidden bg-background sm:max-h-[min(900px,94dvh)] sm:max-w-2xl sm:flex-none sm:rounded-2xl sm:shadow-2xl md:max-w-5xl">
        <div className="flex items-center gap-2 px-2 py-2 sm:px-4 sm:py-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={onClose}
            aria-label="Back"
          >
            <ChevronLeft className="size-6" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pr-3">
            <span className="truncate text-sm font-semibold">{heading}</span>
            {progress !== undefined && (
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}
          </div>
          {onUndo && (
            <Button
              variant="outline"
              className="h-10 shrink-0 gap-1.5"
              onClick={() => void run("undo", onUndo)}
              disabled={busy !== null}
            >
              {busy === "undo" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Undo2 className="size-4" />
              )}
              Undo my changes
            </Button>
          )}
          {onDelete && (
            <Button
              variant={confirmDelete ? "destructive" : "outline"}
              className="h-10 shrink-0 gap-1.5"
              onClick={() =>
                confirmDelete
                  ? void run("delete", onDelete)
                  : setConfirmDelete(true)
              }
              disabled={busy !== null}
            >
              {busy === "delete" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {confirmDelete ? "Tap again to delete" : "Delete"}
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4 sm:px-6 md:grid md:grid-cols-2 md:gap-8">
          <div className="flex gap-2 md:self-start">
            <div className="relative h-[30dvh] min-h-44 flex-1 overflow-hidden rounded-2xl bg-muted md:h-[min(560px,64dvh)]">
              {photo ? (
                <Image
                  src={photo}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 480px, 80vw"
                  className="object-contain"
                />
              ) : (
                onPickPhotos && (
                  <button
                    type="button"
                    onClick={() => void pickPhotos()}
                    className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm font-semibold text-muted-foreground"
                  >
                    <ImagePlus className="size-8" />
                    Choose photos from the gallery
                  </button>
                )
              )}
            </div>
            {(images.length > 1 || onPickPhotos) && (
              <div className="flex w-14 flex-col gap-1.5 overflow-y-auto">
                {images.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Photo ${i + 1}`}
                    className={cn(
                      "relative aspect-square shrink-0 overflow-hidden rounded-lg bg-muted",
                      i === photoIndex && "ring-2 ring-foreground ring-inset",
                    )}
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                      style={{
                        objectPosition: positions[url] ?? DEFAULT_POSITION,
                      }}
                    />
                  </button>
                ))}
                {onPickPhotos && images.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void pickPhotos()}
                    aria-label="Change photos"
                    className="flex aspect-square shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-muted-foreground/50 text-[10px] font-medium text-muted-foreground"
                  >
                    <ImagePlus className="size-4" />
                    Photos
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-5 md:mt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="sheet-price" className="text-sm font-semibold">
                  Price
                </label>
                <MoneyBox
                  id="sheet-price"
                  value={form.price}
                  onChange={(price) => patch({ price })}
                  placeholder="0"
                />
                {was(
                  live !== undefined && toPesewas(form.price) !== live.price,
                  formatMoney(live?.price ?? 0),
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="sheet-sale" className="text-sm font-semibold">
                  Sale price{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <MoneyBox
                  id="sheet-sale"
                  value={form.sale}
                  onChange={(sale) => patch({ sale })}
                  placeholder="—"
                />
                {was(
                  live !== undefined &&
                    (form.sale.trim() === "" ? null : toPesewas(form.sale)) !==
                      live.discountPrice,
                  liveSale,
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Stock</span>
              <div className="flex items-center gap-3">
                <Input
                  inputMode="numeric"
                  value={form.trackStock ? form.stock : ""}
                  onChange={(e) =>
                    patch({ stock: e.target.value.replace(/[^\d]/g, "") })
                  }
                  disabled={!form.trackStock}
                  placeholder={form.trackStock ? "0" : "Always in stock"}
                  aria-label="How many in stock"
                  className="h-12 w-32 text-lg font-semibold"
                />
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={!form.trackStock}
                    onCheckedChange={(on) => patch({ trackStock: !on })}
                  />
                  Always in stock
                </label>
              </div>
              {was(
                live !== undefined &&
                  (form.trackStock !== live.trackStock ||
                    (form.trackStock && Number(form.stock) !== live.stock)),
                live?.trackStock ? `${live.stock} in stock` : "always in stock",
              )}
            </div>

            <ChipGroup
              label="Sizes available"
              options={sizeOptions}
              selected={form.sizes}
              onChange={(sizes) => patch({ sizes })}
              addLabel="Add a size"
            />
            <ChipGroup
              label="Colors"
              options={colorOptions}
              selected={form.colors}
              onChange={(colors) => patch({ colors })}
              addLabel="Add a color"
              rounded
            />

            <div className="flex flex-col gap-2">
              <label htmlFor="sheet-name" className="text-sm font-semibold">
                Name{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <Input
                id="sheet-name"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder={
                  live ? `Item #${live.number}` : "e.g. Linen wrap dress"
                }
                maxLength={200}
                className="h-12 text-base"
              />
              {was(
                live !== undefined && form.title.trim() !== live.title,
                live?.title || `Item #${live?.number}`,
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="sheet-description"
                className="text-sm font-semibold"
              >
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <Textarea
                id="sheet-description"
                rows={3}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                className="text-base"
              />
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border p-3.5">
              <span>
                <span className="block text-sm font-semibold">
                  Show on the shop
                </span>
                <span className="block text-xs text-muted-foreground">
                  Off hides it from customers.
                </span>
              </span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(isActive) => patch({ isActive })}
              />
            </label>
          </div>
        </div>

        <div
          className="flex gap-2 border-t px-4 pt-3 sm:justify-end sm:px-6 sm:pb-4"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {onSkip && (
            <Button
              variant="outline"
              className="h-13 px-5 text-base sm:h-11"
              onClick={onSkip}
              disabled={busy !== null}
            >
              Skip
            </Button>
          )}
          {!onSkip && (
            <Button
              variant="outline"
              className="h-13 gap-1.5 px-5 text-base sm:h-11"
              onClick={onClose}
              disabled={busy !== null}
            >
              <X className="size-4" />
              Cancel
            </Button>
          )}
          <Button
            className="h-13 flex-1 gap-1.5 text-base sm:h-11 sm:flex-none sm:px-8"
            onClick={save}
            disabled={busy !== null}
          >
            {busy === "save" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MoneyBox({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex h-13 min-w-0 items-center gap-2 rounded-xl border-[1.5px] border-foreground px-3.5 focus-within:ring-3 focus-within:ring-ring/40">
      <span className="font-semibold text-muted-foreground">GHS</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        placeholder={placeholder}
        className="w-0 min-w-0 flex-1 bg-transparent text-xl font-bold outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  );
}
