"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Infinity as InfinityIcon,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GalleryBrowser } from "@/components/admin/gallery-browser";
import { GalleryPickerDialog, SelectionFooter } from "@/components/admin/gallery-picker";
import { TagInput } from "@/components/admin/tag-input";
import { createProduct } from "@/lib/api";
import { emitProductCreated } from "@/lib/product-events";
import type { MediaAsset } from "@/lib/types";

interface DraftRow {
  key: string;
  images: string[];
  title: string;
  price: string;
  stock: string;
  alwaysInStock: boolean;
  isActive: boolean;
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
}

type Step = "photos" | "details";

let rowSeq = 0;
function newRow(patch: Partial<DraftRow> = {}): DraftRow {
  rowSeq += 1;
  return {
    key: `row-${rowSeq}`,
    images: [],
    title: "",
    price: "",
    stock: "",
    alwaysInStock: false,
    isActive: true,
    status: "idle",
    ...patch,
  };
}

function rowProblem(row: DraftRow): string | null {
  if (!row.title.trim()) return "Needs a title";
  if (row.price.trim() === "" || Number(row.price) < 0 || Number.isNaN(Number(row.price))) {
    return "Needs a price";
  }
  return null;
}

// Photo-first bulk creation: pick a batch of photos, each becomes a draft
// product in an editable list, then everything is created in one go. The
// draft lives outside the dialog's content, so closing it by accident keeps
// the work — reopening picks up where the vendor left off.
export function ProductBulkCreateDialog({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("photos");
  const [picked, setPicked] = useState<string[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [photoRowKey, setPhotoRowKey] = useState<string | null>(null);

  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkTags, setBulkTags] = useState<string[]>([]);

  const pending = rows.filter((r) => r.status !== "saved");
  const savedCount = rows.length - pending.length;
  const problems = pending.filter((r) => rowProblem(r) !== null).length;
  const photoRow = rows.find((r) => r.key === photoRowKey) ?? null;

  function rememberTitle(asset: MediaAsset) {
    if (asset.title) setTitles((prev) => ({ ...prev, [asset.url]: asset.title! }));
  }

  function togglePicked(asset: MediaAsset) {
    rememberTitle(asset);
    setPicked((prev) =>
      prev.includes(asset.url) ? prev.filter((u) => u !== asset.url) : [...prev, asset.url],
    );
  }

  function goToDetails() {
    // Photos already turned into rows keep their edits; only new picks add rows.
    const existing = new Set(rows.flatMap((r) => r.images));
    const additions = picked
      .filter((url) => !existing.has(url))
      .map((url) => newRow({ images: [url], title: titles[url] ?? "" }));
    setRows((prev) => [...prev, ...additions]);
    setPicked([]);
    setStep("details");
  }

  function patchRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function applyToAll(patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.status === "saved" ? r : { ...r, ...patch })));
  }

  function reset() {
    setRows([]);
    setPicked([]);
    setTitles({});
    setBulkPrice("");
    setBulkTags([]);
    setShowErrors(false);
    setStep("photos");
  }

  async function createAll() {
    setShowErrors(true);
    if (problems > 0) {
      toast.error(`${problems} product${problems === 1 ? " needs" : "s need"} a title or price`);
      return;
    }
    setSaving(true);
    let created = 0;
    // One at a time on purpose: the API derives each slug and display order
    // from what already exists, so parallel creates with similar titles race.
    for (const row of pending) {
      patchRow(row.key, { status: "saving", error: undefined });
      try {
        const product = await createProduct(tenantId, {
          title: row.title.trim(),
          price: Number(row.price) || 0,
          images: row.images,
          tags: bulkTags,
          stock: Number(row.stock) || 0,
          trackStock: !row.alwaysInStock,
          isActive: row.isActive,
        });
        patchRow(row.key, { status: "saved" });
        emitProductCreated(product);
        created += 1;
      } catch (err) {
        patchRow(row.key, { status: "error", error: (err as Error).message || "Couldn't save" });
      }
    }
    setSaving(false);
    router.refresh();

    const failed = pending.length - created;
    if (failed === 0) {
      toast.success(`Added ${created + savedCount} product${created + savedCount === 1 ? "" : "s"}`);
      reset();
      setOpen(false);
    } else {
      toast.error(`${failed} product${failed === 1 ? "" : "s"} couldn't be saved — check the rows marked in red`);
    }
  }

  const draftCount = pending.length;

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
      <DialogTrigger render={<Button variant="outline" className="gap-1.5" />}>
        <Layers className="h-4 w-4" />
        Add several
        {draftCount > 0 && !open && (
          <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
            {draftCount}
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="flex h-[90dvh] flex-col gap-3 sm:h-[88vh] sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center gap-2 pr-8 text-xs text-muted-foreground">
            <StepDot active={step === "photos"} done={step === "details"} n={1} label="Photos" />
            <span className="h-px w-6 bg-border" />
            <StepDot active={step === "details"} done={false} n={2} label="Details" />
          </div>
          <DialogTitle>Add several products</DialogTitle>
          <DialogDescription>
            {step === "photos"
              ? "Pick a photo for each product you're adding — every photo becomes its own product. You can add more angles to any of them next."
              : "Fill in a title and price for each one. Descriptions, discounts and the rest can be added later from each product's page."}
          </DialogDescription>
        </DialogHeader>

        {step === "photos" ? (
          <>
            <GalleryBrowser
              tenantId={tenantId}
              selected={picked}
              onToggle={togglePicked}
              onUploaded={(asset) => {
                rememberTitle(asset);
                setPicked((prev) => (prev.includes(asset.url) ? prev : [...prev, asset.url]));
              }}
              enabled={open}
            />
            <SelectionFooter
              draft={picked}
              onRemove={(url) => setPicked((prev) => prev.filter((u) => u !== url))}
              onClear={() => setPicked([])}
              onCancel={() => (rows.length > 0 ? setStep("details") : setOpen(false))}
              onDone={goToDetails}
              doneLabel={
                picked.length > 0
                  ? `Next: ${picked.length} product${picked.length === 1 ? "" : "s"}`
                  : rows.length > 0
                    ? "Back to details"
                    : "Skip photos"
              }
              emptyHint={
                rows.length > 0
                  ? `${rows.length} product${rows.length === 1 ? "" : "s"} drafted so far`
                  : "Nothing selected yet"
              }
            />
          </>
        ) : (
          <>
            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4">
              <BulkDefaults
                price={bulkPrice}
                onPriceChange={setBulkPrice}
                tags={bulkTags}
                onTagsChange={setBulkTags}
                onApply={applyToAll}
                allAlwaysInStock={pending.length > 0 && pending.every((r) => r.alwaysInStock)}
                allHidden={pending.length > 0 && pending.every((r) => !r.isActive)}
                disabled={saving}
              />

              <div className="mt-4 hidden items-center gap-3 px-3 pb-1.5 text-xs font-medium text-muted-foreground sm:flex">
                <span className="w-14">Photos</span>
                <span className="flex-1">Title</span>
                <span className="w-28">Price (GHS)</span>
                <span className="w-36">Stock</span>
                <span className="w-10 text-center">Live</span>
                <span className="w-8" />
              </div>

              <ul className="mt-3 flex flex-col gap-2 sm:mt-0">
                {rows.map((row, i) => (
                  <BulkRow
                    key={row.key}
                    row={row}
                    index={i}
                    problem={showErrors ? rowProblem(row) : null}
                    disabled={saving}
                    onPatch={(patch) => patchRow(row.key, patch)}
                    onRemove={() => removeRow(row.key)}
                    onEditPhotos={() => setPhotoRowKey(row.key)}
                  />
                ))}
              </ul>

              <div className="mt-3 mb-1 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("photos")}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <ImagePlus className="h-4 w-4" />
                  Add from photos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRows((prev) => [...prev, newRow()])}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Blank row
                </Button>
              </div>
            </div>

            <div className="-mx-4 -mb-4 flex flex-col gap-3 rounded-b-xl border-t bg-muted/50 p-3 sm:flex-row sm:items-center sm:px-4">
              <div className="flex min-w-0 flex-1 items-center gap-3 text-sm">
                <span className="font-medium">
                  {pending.length} to add
                  {savedCount > 0 && (
                    <span className="font-normal text-muted-foreground"> · {savedCount} added</span>
                  )}
                </span>
                {showErrors && problems > 0 && (
                  <span className="text-xs text-destructive">
                    {problems} need{problems === 1 ? "s" : ""} attention
                  </span>
                )}
                {!saving && rows.length > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground hover:underline sm:ml-0"
                  >
                    Start over
                  </button>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("photos")}
                  disabled={saving}
                  className="flex-1 gap-1.5 sm:flex-none"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Photos
                </Button>
                <Button
                  type="button"
                  onClick={createAll}
                  disabled={saving || pending.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving
                    ? "Adding…"
                    : rows.some((r) => r.status === "error")
                      ? `Retry ${pending.length}`
                      : `Add ${pending.length} product${pending.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          </>
        )}

        <GalleryPickerDialog
          tenantId={tenantId}
          open={photoRow !== null}
          onOpenChange={(next) => !next && setPhotoRowKey(null)}
          selected={photoRow?.images ?? []}
          onChange={(urls) => photoRow && patchRow(photoRow.key, { images: urls })}
          title={photoRow?.title ? `Photos for “${photoRow.title}”` : "Photos for this product"}
        />
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${active ? "font-medium text-foreground" : ""}`}>
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
          active || done ? "border-primary bg-primary text-primary-foreground" : ""
        }`}
      >
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      {label}
    </span>
  );
}

function BulkDefaults({
  price,
  onPriceChange,
  tags,
  onTagsChange,
  onApply,
  allAlwaysInStock,
  allHidden,
  disabled,
}: {
  price: string;
  onPriceChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  onApply: (patch: Partial<DraftRow>) => void;
  allAlwaysInStock: boolean;
  allHidden: boolean;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">Apply to all</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-[auto_1fr_auto]">
        <div>
          <Label htmlFor="bulk-price" className="text-xs">
            Same price (GHS)
          </Label>
          <div className="mt-1 flex gap-1.5">
            <Input
              id="bulk-price"
              type="number"
              inputMode="decimal"
              min={0}
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="e.g. 350"
              className="w-28"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => onApply({ price })}
              disabled={disabled || price.trim() === ""}
            >
              Apply
            </Button>
          </div>
        </div>
        <div className="min-w-0">
          <Label className="text-xs">Tags for every product</Label>
          <div className="mt-1">
            <TagInput tags={tags} onChange={onTagsChange} placeholder="e.g. fascinator, wedding…" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Stock &amp; visibility</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onApply({ alwaysInStock: !allAlwaysInStock })}
              disabled={disabled}
              className="gap-1"
            >
              <InfinityIcon className="h-3.5 w-3.5" />
              {allAlwaysInStock ? "Track stock for all" : "All always in stock"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onApply({ isActive: allHidden })}
              disabled={disabled}
            >
              {allHidden ? "Make all live" : "Hide all for now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkRow({
  row,
  index,
  problem,
  disabled,
  onPatch,
  onRemove,
  onEditPhotos,
}: {
  row: DraftRow;
  index: number;
  problem: string | null;
  disabled: boolean;
  onPatch: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
  onEditPhotos: () => void;
}) {
  const locked = disabled || row.status === "saved" || row.status === "saving";
  const titleMissing = problem === "Needs a title";
  const priceMissing = problem === "Needs a price";

  return (
    <li
      className={`relative rounded-lg border p-3 transition-colors ${
        row.status === "saved"
          ? "border-emerald-500/40 bg-emerald-500/5"
          : row.status === "error" || problem
            ? "border-destructive/50"
            : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3 sm:flex-1">
          <button
            type="button"
            onClick={onEditPhotos}
            disabled={locked}
            aria-label={row.images.length ? "Change photos" : "Add photos"}
            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted disabled:cursor-default"
          >
            {row.images[0] ? (
              <>
                <Image src={row.images[0]} alt="" fill sizes="56px" className="object-cover object-top" />
                {row.images.length > 1 && (
                  <span className="absolute right-0.5 bottom-0.5 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
                    +{row.images.length - 1}
                  </span>
                )}
                {!locked && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <ImagePlus className="h-4 w-4 text-white" />
                  </span>
                )}
              </>
            ) : (
              <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImagePlus className="h-4 w-4" />
              </span>
            )}
          </button>
          <Input
            value={row.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder={`Product ${index + 1} title`}
            aria-label="Title"
            aria-invalid={titleMissing || undefined}
            disabled={locked}
            className="min-w-0 flex-1"
          />
          <RowStatus row={row} locked={locked} onRemove={onRemove} className="flex sm:hidden" />
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={row.price}
            onChange={(e) => onPatch({ price: e.target.value })}
            placeholder="Price"
            aria-label="Price (GHS)"
            aria-invalid={priceMissing || undefined}
            disabled={locked}
            className="min-w-0 flex-1 sm:w-28 sm:flex-none"
          />
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:w-36 sm:flex-none">
            {row.alwaysInStock ? (
              <span className="flex h-8 flex-1 items-center rounded-lg border border-dashed px-2 text-xs text-muted-foreground">
                Always
              </span>
            ) : (
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={row.stock}
                onChange={(e) => onPatch({ stock: e.target.value })}
                placeholder="Qty"
                aria-label="Stock"
                disabled={locked}
                className="min-w-0 flex-1"
              />
            )}
            <Button
              type="button"
              variant={row.alwaysInStock ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => onPatch({ alwaysInStock: !row.alwaysInStock })}
              disabled={locked}
              aria-pressed={row.alwaysInStock}
              aria-label="Always in stock"
              title="Always in stock (made to order)"
            >
              <InfinityIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex w-10 justify-center">
            <Switch
              checked={row.isActive}
              onCheckedChange={(checked) => onPatch({ isActive: checked })}
              disabled={locked}
              aria-label="Live on storefront"
            />
          </div>
          <RowStatus row={row} locked={locked} onRemove={onRemove} className="hidden sm:flex" />
        </div>
      </div>

      {(problem || row.status === "error") && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive sm:pl-[4.25rem]">
          {row.status === "error" && <RotateCcw className="h-3 w-3" />}
          {row.status === "error" ? `${row.error} — will retry on the next save` : problem}
        </p>
      )}
    </li>
  );
}

function RowStatus({
  row,
  locked,
  onRemove,
  className,
}: {
  row: DraftRow;
  locked: boolean;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <div className={`w-8 shrink-0 items-center justify-center ${className ?? ""}`}>
      {row.status === "saving" ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : row.status === "saved" ? (
        <Check className="h-4 w-4 text-emerald-600" aria-label="Added" />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={locked}
          aria-label="Remove row"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
