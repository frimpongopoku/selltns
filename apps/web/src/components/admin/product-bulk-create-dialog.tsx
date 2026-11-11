"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Combine,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { GalleryBrowser } from "@/components/admin/gallery-browser";
import { GalleryPickerDialog, SelectionFooter } from "@/components/admin/gallery-picker";
import { TagInput } from "@/components/admin/tag-input";
import { VideoLinksInput } from "@/components/admin/video-links-input";
import { createProduct } from "@/lib/api";
import { emitProductCreated } from "@/lib/product-events";
import { MAX_OPTIONS } from "@/lib/item-options";
import type { MediaAsset, Product } from "@/lib/types";

import { DEFAULT_POSITION, assetPosition } from "@/lib/image-focus";
interface DraftRow {
  key: string;
  images: string[];
  title: string;
  description: string;
  sku: string;
  // Per-product tags, merged with the tags set for every product on save.
  tags: string[];
  videoUrls: string[];
  price: string;
  // "" means no discount / regular price for affiliates.
  discountPrice: string;
  affiliatePrice: string;
  // Offered to affiliates to resell — off sets hiddenFromAllAffiliates.
  forAffiliates: boolean;
  stock: string;
  alwaysInStock: boolean;
  isActive: boolean;
  sizes: string[];
  colors: string[];
  // Photo Drop items this row came from (several once combined) — see
  // createRow below.
  dropItemIds: string[];
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
}

type Step = "photos" | "details";

// Starting values for a row, e.g. from Photo Drop items.
export type BulkRowSeed = Partial<Omit<DraftRow, "key" | "status" | "error">> & {
  /** Focus of the seed's photos (URL → CSS object-position), for thumbnails. */
  imagePositions?: Record<string, string>;
};

let rowSeq = 0;
function newRow(patch: Partial<DraftRow> = {}): DraftRow {
  rowSeq += 1;
  return {
    key: `row-${rowSeq}`,
    images: [],
    title: "",
    description: "",
    sku: "",
    tags: [],
    videoUrls: [],
    price: "",
    discountPrice: "",
    affiliatePrice: "",
    forAffiliates: true,
    stock: "",
    alwaysInStock: false,
    isActive: true,
    sizes: [],
    colors: [],
    dropItemIds: [],
    status: "idle",
    ...patch,
  };
}

function rowProblem(row: DraftRow): string | null {
  if (row.price.trim() === "" || Number(row.price) < 0 || Number.isNaN(Number(row.price))) {
    return "Needs a price";
  }
  if (row.discountPrice.trim() !== "") {
    const discount = Number(row.discountPrice);
    // Same rule the API enforces: a positive whole number below the price.
    if (!Number.isInteger(discount) || discount <= 0 || discount >= Number(row.price)) {
      return "Discount must be a whole number lower than the price";
    }
  }
  if (row.forAffiliates && row.affiliatePrice.trim() !== "") {
    const affiliate = Number(row.affiliatePrice);
    if (!Number.isInteger(affiliate) || affiliate <= 0 || affiliate >= Number(row.price)) {
      return "Affiliate price must be a whole number lower than the price";
    }
  }
  return null;
}

// Photo-first bulk creation: pick a batch of photos, each becomes a draft
// product in an editable list, then everything is created in one go. The
// draft lives outside the dialog's content, so closing it by accident keeps
// the work — reopening picks up where the vendor left off.
//
// Photo Drop reuses it controlled and without its trigger: it mounts it
// (keyed) with `initialRows`, and passes `createRow` so each product is
// created through the drop, which also moves its photos into the gallery.
export function ProductBulkCreateDialog({
  tenantId,
  initialRows,
  open: controlledOpen,
  onOpenChange,
  createRow,
  onAllCreated,
}: {
  tenantId: string;
  initialRows?: BulkRowSeed[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  createRow?: (payload: Partial<Product>, dropItemIds: string[]) => Promise<Product>;
  onAllCreated?: () => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [step, setStep] = useState<Step>(initialRows?.length ? "details" : "photos");
  const [picked, setPicked] = useState<string[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  // Each photo's focus (URL → CSS object-position), learned as photos are picked.
  const [positions, setPositions] = useState<Record<string, string>>(() =>
    Object.assign({}, ...(initialRows ?? []).map((r) => r.imagePositions ?? {})),
  );
  const [rows, setRows] = useState<DraftRow[]>(() => (initialRows ?? []).map((seed) => newRow(seed)));
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [photoRowKey, setPhotoRowKey] = useState<string | null>(null);
  // Rows ticked for combining into one product.
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkDiscount, setBulkDiscount] = useState("");
  const [bulkAffiliatePrice, setBulkAffiliatePrice] = useState("");
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkSizes, setBulkSizes] = useState<string[]>([]);
  const [bulkColors, setBulkColors] = useState<string[]>([]);

  const pending = rows.filter((r) => r.status !== "saved");
  const savedCount = rows.length - pending.length;
  const problems = pending.filter((r) => rowProblem(r) !== null).length;
  const photoRow = rows.find((r) => r.key === photoRowKey) ?? null;
  const allExpanded = pending.length > 0 && pending.every((r) => expandedKeys.has(r.key));

  function rememberTitle(asset: MediaAsset) {
    rememberPosition(asset);
    if (asset.title) setTitles((prev) => ({ ...prev, [asset.url]: asset.title! }));
  }

  function rememberPosition(asset: MediaAsset) {
    setPositions((prev) => ({ ...prev, [asset.url]: assetPosition(asset) }));
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
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleChecked(key: string) {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Merges the ticked rows into the first of them (in list order): its
  // details are kept and the others' photos are appended as extra angles.
  function combineChecked() {
    const chosen = rows.filter((r) => checkedKeys.has(r.key) && r.status !== "saved");
    if (chosen.length < 2) return;
    const [first, ...rest] = chosen;
    const images = [...new Set(chosen.flatMap((r) => r.images))];
    const title = first.title.trim() || rest.find((r) => r.title.trim())?.title || "";
    const dropItemIds = chosen.flatMap((r) => r.dropItemIds);
    const restKeys = new Set(rest.map((r) => r.key));
    setRows((prev) =>
      prev
        .filter((r) => !restKeys.has(r.key))
        .map((r) => (r.key === first.key ? { ...r, images, title, dropItemIds } : r)),
    );
    setCheckedKeys(new Set());
    toast.success(`Combined into one product with ${images.length} photo${images.length === 1 ? "" : "s"}`);
  }

  function applyToAll(patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.status === "saved" ? r : { ...r, ...patch })));
  }

  function reset() {
    setRows([]);
    setPicked([]);
    setTitles({});
    setBulkPrice("");
    setBulkDiscount("");
    setBulkAffiliatePrice("");
    setCheckedKeys(new Set());
    setExpandedKeys(new Set());
    setBulkTags([]);
    setBulkSizes([]);
    setBulkColors([]);
    setShowErrors(false);
    setStep("photos");
  }

  async function createAll() {
    setShowErrors(true);
    if (problems > 0) {
      toast.error(`${problems} product${problems === 1 ? " needs" : "s need"} attention — check the rows marked in red`);
      return;
    }
    setSaving(true);
    let created = 0;
    // One at a time on purpose: the API derives each slug and display order
    // from what already exists, so parallel creates with similar titles race.
    for (const row of pending) {
      patchRow(row.key, { status: "saving", error: undefined });
      try {
        const payload: Partial<Product> = {
          title: row.title.trim(),
          description: row.description.trim(),
          sku: row.sku.trim(),
          videoUrls: row.videoUrls,
          price: Number(row.price) || 0,
          discountPrice: row.discountPrice.trim() === "" ? null : Number(row.discountPrice),
          // An affiliate price only matters if affiliates can see the product.
          affiliatePrice:
            row.forAffiliates && row.affiliatePrice.trim() !== "" ? Number(row.affiliatePrice) : null,
          hiddenFromAllAffiliates: !row.forAffiliates,
          images: row.images,
          tags: [...new Set([...bulkTags, ...row.tags])],
          sizes: row.sizes,
          colors: row.colors,
          stock: Number(row.stock) || 0,
          trackStock: !row.alwaysInStock,
          isActive: row.isActive,
        };
        const product =
          createRow && row.dropItemIds.length > 0
            ? await createRow(payload, row.dropItemIds)
            : await createProduct(tenantId, payload);
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
      onAllCreated?.();
    } else {
      toast.error(`${failed} product${failed === 1 ? "" : "s"} couldn't be saved — check the rows marked in red`);
    }
  }

  const draftCount = pending.length;

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
      {controlledOpen === undefined && (
        <DialogTrigger render={<Button variant="outline" className="gap-1.5" />}>
          <Layers className="h-4 w-4" />
          Add several
          {draftCount > 0 && !open && (
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {draftCount}
            </span>
          )}
        </DialogTrigger>
      )}
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
              ? "Pick photos for the products you're adding — each photo starts as its own product. Got several angles of one product? Pick them all, then tick and combine them on the next step."
              : "Fill in a price for each one (a name is optional), and open “More details” for descriptions, affiliates, sizes, colors and more. Tick photos of the same product to combine them."}
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
                discount={bulkDiscount}
                onDiscountChange={setBulkDiscount}
                affiliatePrice={bulkAffiliatePrice}
                onAffiliatePriceChange={setBulkAffiliatePrice}
                allHiddenFromAffiliates={pending.length > 0 && pending.every((r) => !r.forAffiliates)}
                tags={bulkTags}
                onTagsChange={setBulkTags}
                sizes={bulkSizes}
                onSizesChange={setBulkSizes}
                colors={bulkColors}
                onColorsChange={setBulkColors}
                onApply={applyToAll}
                allAlwaysInStock={pending.length > 0 && pending.every((r) => r.alwaysInStock)}
                allHidden={pending.length > 0 && pending.every((r) => !r.isActive)}
                disabled={saving}
              />

              {pending.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedKeys(allExpanded ? new Set() : new Set(pending.map((r) => r.key)))
                    }
                    disabled={saving}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${allExpanded ? "rotate-180" : ""}`} />
                    {allExpanded ? "Collapse all details" : "Expand all details"}
                  </button>
                </div>
              )}

              <div className="mt-1 hidden items-center gap-3 px-3 pb-1.5 text-xs font-medium text-muted-foreground sm:flex">
                <span className="w-4" />
                <span className="w-14">Photos</span>
                <span className="flex-1">Title</span>
                <span className="w-24">Price (GHS)</span>
                <span className="w-24">Discount</span>
                <span className="w-36">Stock</span>
                <span className="w-10 text-center">Live</span>
                <span className="w-8" />
              </div>

              {checkedKeys.size > 0 && (
                <div className="sticky top-0 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2 pl-3 text-sm shadow-sm">
                  <span className="flex-1 font-medium">
                    {checkedKeys.size} ticked
                    {checkedKeys.size === 1 && (
                      <span className="font-normal text-muted-foreground"> — tick at least one more to combine</span>
                    )}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCheckedKeys(new Set())}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={combineChecked}
                    disabled={saving || checkedKeys.size < 2}
                    className="gap-1.5"
                  >
                    <Combine className="h-4 w-4" />
                    Combine into one product
                  </Button>
                </div>
              )}

              <ul className="mt-3 flex flex-col gap-2 sm:mt-0">
                {rows.map((row) => (
                  <BulkRow
                    key={row.key}
                    row={row}
                    imagePosition={(row.images[0] && positions[row.images[0]]) || DEFAULT_POSITION}
                    problem={showErrors ? rowProblem(row) : null}
                    disabled={saving}
                    checked={checkedKeys.has(row.key)}
                    onToggleChecked={() => toggleChecked(row.key)}
                    expanded={expandedKeys.has(row.key)}
                    onToggleExpanded={() => toggleExpanded(row.key)}
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
          onPicked={rememberPosition}
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
  discount,
  onDiscountChange,
  affiliatePrice,
  onAffiliatePriceChange,
  allHiddenFromAffiliates,
  tags,
  onTagsChange,
  sizes,
  onSizesChange,
  colors,
  onColorsChange,
  onApply,
  allAlwaysInStock,
  allHidden,
  disabled,
}: {
  price: string;
  onPriceChange: (v: string) => void;
  discount: string;
  onDiscountChange: (v: string) => void;
  affiliatePrice: string;
  onAffiliatePriceChange: (v: string) => void;
  allHiddenFromAffiliates: boolean;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  sizes: string[];
  onSizesChange: (v: string[]) => void;
  colors: string[];
  onColorsChange: (v: string[]) => void;
  onApply: (patch: Partial<DraftRow>) => void;
  allAlwaysInStock: boolean;
  allHidden: boolean;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">Apply to all</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <ApplyField
          id="bulk-price"
          label="Same price (GHS)"
          placeholder="e.g. 350"
          value={price}
          onChange={onPriceChange}
          onApply={() => onApply({ price })}
          disabled={disabled}
        />
        <ApplyField
          id="bulk-discount"
          label="Same discount price (GHS)"
          placeholder="e.g. 300"
          value={discount}
          onChange={onDiscountChange}
          onApply={() => onApply({ discountPrice: discount })}
          onClear={() => onApply({ discountPrice: "" })}
          clearLabel="Remove all discounts"
          disabled={disabled}
        />
        <ApplyField
          id="bulk-affiliate-price"
          label="Same affiliate price (GHS)"
          placeholder="e.g. 280"
          value={affiliatePrice}
          onChange={onAffiliatePriceChange}
          onApply={() => onApply({ affiliatePrice })}
          onClear={() => onApply({ affiliatePrice: "" })}
          clearLabel="Remove all affiliate prices"
          disabled={disabled}
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onApply({ forAffiliates: allHiddenFromAffiliates })}
              disabled={disabled}
            >
              {allHiddenFromAffiliates ? "Offer all to affiliates" : "Hide all from affiliates"}
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="min-w-0">
          <Label className="text-xs">Sizes</Label>
          <div className="mt-1">
            <TagInput
              tags={sizes}
              onChange={onSizesChange}
              placeholder="e.g. S, M, L"
              preserveCase
              maxTags={MAX_OPTIONS}
            />
          </div>
        </div>
        <div className="min-w-0">
          <Label className="text-xs">Colors</Label>
          <div className="mt-1">
            <TagInput
              tags={colors}
              onChange={onColorsChange}
              placeholder="e.g. Black, Red"
              preserveCase
              maxTags={MAX_OPTIONS}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onApply({ sizes, colors })}
          disabled={disabled || (sizes.length === 0 && colors.length === 0)}
        >
          Apply sizes &amp; colors
        </Button>
      </div>
    </div>
  );
}

function ApplyField({
  id,
  label,
  placeholder,
  value,
  onChange,
  onApply,
  onClear,
  clearLabel,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onClear?: () => void;
  clearLabel?: string;
  disabled: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="mt-1 flex gap-1.5">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-28"
          disabled={disabled}
        />
        <Button type="button" variant="secondary" onClick={onApply} disabled={disabled || value.trim() === ""}>
          Apply
        </Button>
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}

function BulkRow({
  row,
  imagePosition,
  problem,
  disabled,
  checked,
  onToggleChecked,
  expanded,
  onToggleExpanded,
  onPatch,
  onRemove,
  onEditPhotos,
}: {
  row: DraftRow;
  imagePosition: string;
  problem: string | null;
  disabled: boolean;
  checked: boolean;
  onToggleChecked: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  onPatch: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
  onEditPhotos: () => void;
}) {
  const locked = disabled || row.status === "saved" || row.status === "saving";
  const priceMissing = problem === "Needs a price";
  const discountInvalid = problem?.startsWith("Discount") ?? false;
  const affiliateInvalid = problem?.startsWith("Affiliate") ?? false;
  // The affiliate price lives in the details panel, so open it when that's what's wrong.
  const detailsOpen = (expanded || affiliateInvalid) && !locked;
  const detailsSummary = [
    row.description.trim() && "Description",
    !row.forAffiliates
      ? "Hidden from affiliates"
      : row.affiliatePrice.trim() && `Affiliate GHS ${row.affiliatePrice}`,
    row.sku.trim() && `SKU ${row.sku.trim()}`,
    row.sizes.length > 0 && `Sizes: ${row.sizes.join(", ")}`,
    row.colors.length > 0 && `Colors: ${row.colors.join(", ")}`,
    row.tags.length > 0 && `${row.tags.length} tag${row.tags.length === 1 ? "" : "s"}`,
    row.videoUrls.length > 0 && `${row.videoUrls.length} video${row.videoUrls.length === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

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
          <Checkbox
            checked={checked}
            onCheckedChange={onToggleChecked}
            disabled={locked}
            aria-label="Tick to combine with other photos"
          />
          <button
            type="button"
            onClick={onEditPhotos}
            disabled={locked}
            aria-label={row.images.length ? "Change photos" : "Add photos"}
            title="Add or change this product's photos"
            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted disabled:cursor-default"
          >
            {row.images[0] ? (
              <>
                <Image
                  src={row.images[0]}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                  style={{ objectPosition: imagePosition }}
                />
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
            placeholder="Name (optional)"
            aria-label="Name (optional)"
            disabled={locked}
            className="min-w-0 flex-1"
          />
          <RowStatus row={row} locked={locked} onRemove={onRemove} className="flex sm:hidden" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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
            className="min-w-0 flex-1 sm:w-24 sm:flex-none"
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={row.discountPrice}
            onChange={(e) => onPatch({ discountPrice: e.target.value })}
            placeholder="Discount"
            aria-label="Discount price (GHS), optional"
            aria-invalid={discountInvalid || undefined}
            disabled={locked}
            className="min-w-0 flex-1 sm:w-24 sm:flex-none"
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

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:pl-[5.25rem]">
        {!locked && (
          <button
            type="button"
            onClick={onEditPhotos}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ImagePlus className="h-3 w-3" />
            {row.images.length === 0
              ? "Add photos"
              : `${row.images.length} photo${row.images.length === 1 ? "" : "s"} · add more angles`}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleExpanded}
          disabled={locked}
          aria-expanded={detailsOpen}
          className="inline-flex max-w-full min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground"
        >
          <span className="font-medium">{detailsOpen ? "Hide details" : "More details"}</span>
          {!detailsOpen && detailsSummary && <span className="truncate">· {detailsSummary}</span>}
          {!locked && (
            <ChevronDown
              className={`h-3 w-3 shrink-0 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>
      </div>

      {detailsOpen && (
        <div className="mt-3 grid gap-3 border-t pt-3 sm:ml-[5.25rem] sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor={`${row.key}-description`} className="text-xs">
              Description
            </Label>
            <Textarea
              id={`${row.key}-description`}
              value={row.description}
              onChange={(e) => onPatch({ description: e.target.value })}
              placeholder="Materials, fit, care…"
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Affiliates</Label>
            <div className="mt-1 flex items-center gap-2">
              <Switch
                checked={row.forAffiliates}
                onCheckedChange={(checked) => onPatch({ forAffiliates: checked })}
                aria-label="Offer to affiliates"
              />
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={row.forAffiliates ? row.affiliatePrice : ""}
                onChange={(e) => onPatch({ affiliatePrice: e.target.value })}
                placeholder={row.forAffiliates ? "Affiliate price (GHS)" : "Not offered to affiliates"}
                aria-label="Affiliate price (GHS), optional"
                aria-invalid={affiliateInvalid || undefined}
                disabled={!row.forAffiliates}
                className="min-w-0 flex-1"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {row.forAffiliates
                ? "What affiliates pay to resell it — leave empty for your regular price."
                : "Affiliates won't be able to resell this product."}
            </p>
          </div>

          <div>
            <Label htmlFor={`${row.key}-sku`} className="text-xs">
              SKU
            </Label>
            <Input
              id={`${row.key}-sku`}
              value={row.sku}
              onChange={(e) => onPatch({ sku: e.target.value })}
              placeholder="Optional"
              className="mt-1"
            />
          </div>

          <div className="min-w-0">
            <Label className="text-xs">Sizes</Label>
            <div className="mt-1">
              <TagInput
                tags={row.sizes}
                onChange={(sizes) => onPatch({ sizes })}
                placeholder="e.g. S, M, L"
                preserveCase
                maxTags={MAX_OPTIONS}
              />
            </div>
          </div>
          <div className="min-w-0">
            <Label className="text-xs">Colors</Label>
            <div className="mt-1">
              <TagInput
                tags={row.colors}
                onChange={(colors) => onPatch({ colors })}
                placeholder="e.g. Black, Red"
                preserveCase
                maxTags={MAX_OPTIONS}
              />
            </div>
          </div>

          <div className="min-w-0">
            <Label className="text-xs">Tags for this product</Label>
            <div className="mt-1">
              <TagInput tags={row.tags} onChange={(tags) => onPatch({ tags })} placeholder="Add a tag…" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Added on top of the tags for every product.</p>
          </div>
          <div className="min-w-0">
            <Label className="text-xs">Videos</Label>
            <div className="mt-1">
              <VideoLinksInput videos={row.videoUrls} onChange={(videoUrls) => onPatch({ videoUrls })} />
            </div>
          </div>
        </div>
      )}

      {(problem || row.status === "error") && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive sm:pl-[5.25rem]">
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
