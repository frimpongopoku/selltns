"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { bulkUpdateProducts, type BulkProductEdit } from "@/lib/api";
import { productImagePosition } from "@/lib/image-focus";
import { MAX_OPTIONS } from "@/lib/item-options";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

import { hasName, productName } from "@/lib/product-name";
type Field = "name" | "stock" | "price" | "sale" | "affiliate" | "sizes" | "colors" | "live";

const FIELDS: { key: Field; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "stock", label: "Stock" },
  { key: "price", label: "Price" },
  { key: "sale", label: "Sale price" },
  { key: "affiliate", label: "Affiliate price" },
  { key: "sizes", label: "Sizes" },
  { key: "colors", label: "Colors" },
  { key: "live", label: "Live" },
];

// Mirrors MAX_BULK_TITLE_LENGTH on the API.
const MAX_TITLE_LENGTH = 200;

// Mirrors MAX_OPTION_LENGTH on the API.
const MAX_OPTION_LENGTH = 30;

// "S, M , l, M" → ["S", "M", "l"]: trimmed, blanks dropped, duplicates
// (ignoring case) dropped, order kept — same as the API does.
function optionsOf(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(",")) {
    const option = raw.trim();
    if (!option || seen.has(option.toLowerCase())) continue;
    seen.add(option.toLowerCase());
    out.push(option);
  }
  return out;
}

const optionsText = (options: string[]) => options.join(", ");
const sameOptions = (a: string[], b: string[]) => a.join("\u0000") === b.join("\u0000");

function optionsError(options: string[], noun: "sizes" | "colors"): string | null {
  if (options.length > MAX_OPTIONS) return `At most ${MAX_OPTIONS} ${noun}`;
  if (options.some((o) => o.length > MAX_OPTION_LENGTH)) {
    return `Each of the ${noun} must be ${MAX_OPTION_LENGTH} characters or fewer`;
  }
  return null;
}

// What the vendor has typed for one product. Numbers stay strings while
// typing so a cleared box doesn't snap to 0.
type Draft = {
  title: string;
  stock: string;
  trackStock: boolean;
  price: string;
  sale: string;
  affiliate: string;
  sizes: string;
  colors: string;
  isActive: boolean;
};

function draftOf(p: Product): Draft {
  return {
    title: p.title,
    stock: String(p.stock),
    trackStock: p.trackStock,
    price: String(p.price),
    sale: p.discountPrice == null ? "" : String(p.discountPrice),
    affiliate: p.affiliatePrice == null ? "" : String(p.affiliatePrice),
    sizes: optionsText(p.sizes),
    colors: optionsText(p.colors),
    isActive: p.isActive,
  };
}

const wholeNumber = (s: string) => /^\d+$/.test(s.trim());

// The changes for one product, or null when nothing changed. Also returns
// the problem with this row, if any, so it can be shown before saving.
function editOf(p: Product, d: Draft): { edit: BulkProductEdit | null; error: string | null } {
  const edit: BulkProductEdit = { id: p.id };
  let error: string | null = null;

  const title = d.title.trim();
  if (title.length > MAX_TITLE_LENGTH) error = `Name must be ${MAX_TITLE_LENGTH} characters or fewer`;
  else if (title !== p.title) edit.title = title;

  if (d.trackStock !== p.trackStock) edit.trackStock = d.trackStock;
  if (d.trackStock) {
    if (!wholeNumber(d.stock)) error = "Stock must be a whole number";
    else if (Number(d.stock) !== p.stock) edit.stock = Number(d.stock);
  }

  if (!wholeNumber(d.price)) error ??= "Price must be a whole number";
  else if (Number(d.price) !== p.price) edit.price = Number(d.price);

  const price = wholeNumber(d.price) ? Number(d.price) : p.price;
  if (d.sale.trim() === "") {
    if (p.discountPrice != null) edit.discountPrice = null;
  } else if (!wholeNumber(d.sale) || Number(d.sale) <= 0) {
    error ??= "Sale price must be a whole number";
  } else if (Number(d.sale) >= price) {
    error ??= "Sale price must be lower than the price";
  } else if (Number(d.sale) !== p.discountPrice) {
    edit.discountPrice = Number(d.sale);
  }

  if (d.affiliate.trim() === "") {
    if (p.affiliatePrice != null) edit.affiliatePrice = null;
  } else if (!wholeNumber(d.affiliate) || Number(d.affiliate) <= 0) {
    error ??= "Affiliate price must be a whole number";
  } else if (Number(d.affiliate) >= price) {
    error ??= "Affiliate price must be lower than the price";
  } else if (Number(d.affiliate) !== p.affiliatePrice) {
    edit.affiliatePrice = Number(d.affiliate);
  }

  const sizes = optionsOf(d.sizes);
  error ??= optionsError(sizes, "sizes");
  if (!sameOptions(sizes, p.sizes)) edit.sizes = sizes;
  const colors = optionsOf(d.colors);
  error ??= optionsError(colors, "colors");
  if (!sameOptions(colors, p.colors)) edit.colors = colors;

  if (d.isActive !== p.isActive) edit.isActive = d.isActive;

  return { edit: Object.keys(edit).length > 1 ? edit : null, error };
}

// Edits names, stock, prices, sizes, colors and live status for many products at once:
// one row per product to type each value, plus a "set all" row on top.
export function BulkEditProductsDialog({
  open,
  onOpenChange,
  products,
  tenantId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  tenantId: string;
  onSaved: (products: Product[]) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        {open && products.length > 0 && (
          <Editor
            products={products}
            tenantId={tenantId}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Editor({
  products,
  tenantId,
  onClose,
  onSaved,
}: {
  products: Product[];
  tenantId: string;
  onClose: () => void;
  onSaved: (products: Product[]) => void;
}) {
  const [fields, setFields] = useState<Set<Field>>(() => new Set(["stock"]));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(products.map((p) => [p.id, draftOf(p)])),
  );
  const [allStock, setAllStock] = useState("");
  const [find, setFind] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [allPrice, setAllPrice] = useState("");
  const [allSale, setAllSale] = useState("");
  const [allAffiliate, setAllAffiliate] = useState("");
  const [allSizes, setAllSizes] = useState("");
  const [allColors, setAllColors] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = products.map((p) => ({ product: p, draft: drafts[p.id], ...editOf(p, drafts[p.id]) }));
  const changed = rows.filter((r) => r.edit !== null);
  const errors = rows.filter((r) => r.error !== null);

  function patch(id: string, change: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...change } }));
  }

  function patchAll(change: (d: Draft) => Partial<Draft>) {
    setDrafts((prev) =>
      Object.fromEntries(Object.entries(prev).map(([id, d]) => [id, { ...d, ...change(d) }])),
    );
  }

  function toggleField(key: Field) {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else next.add(key);
      return next;
    });
  }

  // Enter jumps to the same box on the next product, so a column of stock
  // numbers can be typed without reaching for the mouse.
  function handleEnter(e: React.KeyboardEvent<HTMLInputElement>, column: string, index: number) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = document.querySelector<HTMLInputElement>(
      `[data-bulk-cell="${column}-${index + (e.shiftKey ? -1 : 1)}"]`,
    );
    next?.focus();
    next?.select();
  }

  async function save() {
    if (errors.length > 0) {
      toast.error(errors[0].error, { description: productName(errors[0].product) });
      return;
    }
    if (changed.length === 0) return;
    setSaving(true);
    try {
      const { products: saved } = await bulkUpdateProducts(
        tenantId,
        changed.map((r) => r.edit as BulkProductEdit),
      );
      onSaved(saved);
      toast.success(`Saved ${saved.length} product${saved.length === 1 ? "" : "s"}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the changes");
    } finally {
      setSaving(false);
    }
  }

  const show = (key: Field) => fields.has(key);

  return (
    <>
      <DialogHeader className="border-b p-4 pr-12">
        <DialogTitle>
          Edit {products.length} product{products.length === 1 ? "" : "s"}
        </DialogTitle>
        <DialogDescription>
          Type a value for each product, or use the top row to set them all at once. Press Enter to
          move down the column. Separate sizes and colors with commas. Renaming a product keeps its
          link the same.
        </DialogDescription>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Edit:</span>
          {FIELDS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleField(key)}
              aria-pressed={show(key)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                show(key)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background shadow-[0_1px_0_var(--border)]">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium sm:px-4">Product</th>
              {show("stock") && <th className="px-1.5 py-2 sm:px-2 font-medium">Stock</th>}
              {show("price") && <th className="px-1.5 py-2 sm:px-2 font-medium">Price (GHS)</th>}
              {show("sale") && <th className="px-1.5 py-2 sm:px-2 font-medium">Sale price</th>}
              {show("affiliate") && <th className="px-1.5 py-2 sm:px-2 font-medium">Affiliate price</th>}
              {show("sizes") && <th className="px-1.5 py-2 sm:px-2 font-medium">Sizes</th>}
              {show("colors") && <th className="px-1.5 py-2 sm:px-2 font-medium">Colors</th>}
              {show("live") && <th className="px-1.5 py-2 sm:px-2 pr-4 font-medium">Live</th>}
            </tr>
            <tr className="bg-muted/50 align-top">
              <td className="px-3 py-2 text-xs font-medium sm:px-4">
                {show("name") ? (
                  // Names are all different, so "set all" for them is a
                  // find-and-replace, e.g. fixing a misspelling everywhere.
                  <div className="flex min-w-[150px] flex-col gap-1">
                    <span>Set all</span>
                    <Input
                      value={find}
                      onChange={(e) => setFind(e.target.value)}
                      placeholder="Find in names"
                      className="h-8 font-normal"
                    />
                    <Input
                      value={replaceWith}
                      onChange={(e) => setReplaceWith(e.target.value)}
                      placeholder="Replace with"
                      className="h-8 font-normal"
                    />
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="self-start"
                      disabled={find === ""}
                      onClick={() => patchAll((d) => ({ title: d.title.split(find).join(replaceWith) }))}
                    >
                      Replace in all names
                    </Button>
                  </div>
                ) : (
                  "Set all"
                )}
              </td>
              {show("stock") && (
                <td className="px-1.5 py-2 sm:px-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      inputMode="numeric"
                      value={allStock}
                      onChange={(e) => setAllStock(e.target.value)}
                      placeholder="10"
                      className="h-8 w-16 sm:w-20"
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={!wholeNumber(allStock)}
                        onClick={() => patchAll(() => ({ stock: allStock.trim(), trackStock: true }))}
                      >
                        Set
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={!wholeNumber(allStock)}
                        title="Add this many to each product's stock"
                        onClick={() =>
                          patchAll((d) =>
                            d.trackStock && wholeNumber(d.stock)
                              ? { stock: String(Number(d.stock) + Number(allStock)) }
                              : {},
                          )
                        }
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </td>
              )}
              {show("price") && (
                <td className="px-1.5 py-2 sm:px-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      inputMode="numeric"
                      value={allPrice}
                      onChange={(e) => setAllPrice(e.target.value)}
                      placeholder="150"
                      className="h-8 w-[4.5rem] sm:w-24"
                    />
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="self-start"
                      disabled={!wholeNumber(allPrice)}
                      onClick={() => patchAll(() => ({ price: allPrice.trim() }))}
                    >
                      Set
                    </Button>
                  </div>
                </td>
              )}
              {show("sale") && (
                <td className="px-1.5 py-2 sm:px-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      inputMode="numeric"
                      value={allSale}
                      onChange={(e) => setAllSale(e.target.value)}
                      placeholder="120"
                      className="h-8 w-[4.5rem] sm:w-24"
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={!wholeNumber(allSale)}
                        onClick={() => patchAll(() => ({ sale: allSale.trim() }))}
                      >
                        Set
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => patchAll(() => ({ sale: "" }))}
                      >
                        No sale
                      </Button>
                    </div>
                  </div>
                </td>
              )}
              {show("affiliate") && (
                <td className="px-1.5 py-2 sm:px-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      inputMode="numeric"
                      value={allAffiliate}
                      onChange={(e) => setAllAffiliate(e.target.value)}
                      placeholder="130"
                      className="h-8 w-[4.5rem] sm:w-24"
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={!wholeNumber(allAffiliate)}
                        onClick={() => patchAll(() => ({ affiliate: allAffiliate.trim() }))}
                      >
                        Set
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        title="Affiliates pay the regular price"
                        onClick={() => patchAll(() => ({ affiliate: "" }))}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </td>
              )}
              {show("sizes") && (
                <OptionsSetAll
                  value={allSizes}
                  onChange={setAllSizes}
                  placeholder="S, M, L"
                  onReplace={() => patchAll(() => ({ sizes: optionsText(optionsOf(allSizes)) }))}
                  onAdd={() =>
                    patchAll((d) => ({ sizes: optionsText(optionsOf(`${d.sizes},${allSizes}`)) }))
                  }
                />
              )}
              {show("colors") && (
                <OptionsSetAll
                  value={allColors}
                  onChange={setAllColors}
                  placeholder="Black, Red"
                  onReplace={() => patchAll(() => ({ colors: optionsText(optionsOf(allColors)) }))}
                  onAdd={() =>
                    patchAll((d) => ({ colors: optionsText(optionsOf(`${d.colors},${allColors}`)) }))
                  }
                />
              )}
              {show("live") && (
                <td className="px-1.5 py-2 sm:px-2 pr-4">
                  <div className="flex flex-col items-start gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => patchAll(() => ({ isActive: true }))}
                    >
                      All live
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => patchAll(() => ({ isActive: false }))}
                    >
                      None live
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product: p, draft: d, edit, error }, i) => (
              <tr
                key={p.id}
                className={cn("border-b align-middle last:border-0", edit && "bg-primary/[0.04]")}
              >
                <td className="px-3 py-2 sm:px-4">
                  <div
                    className={cn(
                      "flex items-center gap-2 sm:gap-2.5",
                      show("name") ? "min-w-[180px] sm:min-w-[240px]" : "min-w-[110px] sm:min-w-[150px]",
                    )}
                  >
                    <div
                      className="size-8 shrink-0 sm:size-9 rounded-md bg-muted bg-cover"
                      style={
                        p.images[0]
                          ? {
                              backgroundImage: `url(${p.images[0]})`,
                              backgroundPosition: productImagePosition(p, p.images[0]),
                            }
                          : undefined
                      }
                    />
                    <div className="min-w-0 flex-1">
                      {show("name") ? (
                        <Input
                          data-bulk-cell={`name-${i}`}
                          value={d.title}
                          onChange={(e) => patch(p.id, { title: e.target.value })}
                          onKeyDown={(e) => handleEnter(e, "name", i)}
                          placeholder={`Item #${p.number}`}
                          aria-label={`Name for ${productName(p)}`}
                          className={cn("h-8", d.title.trim() !== p.title && "border-primary")}
                        />
                      ) : (
                        <p className={cn("line-clamp-2 text-[13px] leading-snug sm:text-sm", !hasName(p) && "text-muted-foreground")}>
                          {productName(p)}
                        </p>
                      )}
                      {error ? (
                        <p className="text-[11px] text-destructive">{error}</p>
                      ) : (
                        edit && <p className="text-[11px] text-primary">Changed</p>
                      )}
                    </div>
                  </div>
                </td>
                {show("stock") && (
                  <td className="px-1.5 py-2 sm:px-2">
                    {d.trackStock ? (
                      <div className="flex flex-col gap-0.5">
                        <Input
                          data-bulk-cell={`stock-${i}`}
                          inputMode="numeric"
                          value={d.stock}
                          onChange={(e) => patch(p.id, { stock: e.target.value })}
                          onKeyDown={(e) => handleEnter(e, "stock", i)}
                          onFocus={(e) => e.target.select()}
                          aria-label={`Stock for ${productName(p)}`}
                          aria-invalid={!wholeNumber(d.stock) || undefined}
                          className={cn("h-8 w-16 sm:w-20", Number(d.stock) !== p.stock && "border-primary")}
                        />
                        <button
                          type="button"
                          onClick={() => patch(p.id, { trackStock: false })}
                          className="self-start text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Always available
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs leading-tight">Always available</span>
                        <button
                          type="button"
                          onClick={() => patch(p.id, { trackStock: true })}
                          className="self-start text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Count stock
                        </button>
                      </div>
                    )}
                  </td>
                )}
                {show("price") && (
                  <td className="px-1.5 py-2 sm:px-2">
                    <Input
                      data-bulk-cell={`price-${i}`}
                      inputMode="numeric"
                      value={d.price}
                      onChange={(e) => patch(p.id, { price: e.target.value })}
                      onKeyDown={(e) => handleEnter(e, "price", i)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Price for ${productName(p)}`}
                      aria-invalid={!wholeNumber(d.price) || undefined}
                      className={cn("h-8 w-[4.5rem] sm:w-24", d.price.trim() !== String(p.price) && "border-primary")}
                    />
                  </td>
                )}
                {show("sale") && (
                  <td className="px-1.5 py-2 sm:px-2">
                    <Input
                      data-bulk-cell={`sale-${i}`}
                      inputMode="numeric"
                      value={d.sale}
                      onChange={(e) => patch(p.id, { sale: e.target.value })}
                      onKeyDown={(e) => handleEnter(e, "sale", i)}
                      onFocus={(e) => e.target.select()}
                      placeholder="No sale"
                      aria-label={`Sale price for ${productName(p)}`}
                      className={cn(
                        "h-8 w-[4.5rem] sm:w-24",
                        d.sale.trim() !== (p.discountPrice == null ? "" : String(p.discountPrice)) &&
                          "border-primary",
                      )}
                    />
                  </td>
                )}
                {show("affiliate") && (
                  <td className="px-1.5 py-2 sm:px-2">
                    <Input
                      data-bulk-cell={`affiliate-${i}`}
                      inputMode="numeric"
                      value={d.affiliate}
                      onChange={(e) => patch(p.id, { affiliate: e.target.value })}
                      onKeyDown={(e) => handleEnter(e, "affiliate", i)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Regular"
                      title="Empty = affiliates pay the regular price"
                      aria-label={`Affiliate price for ${productName(p)}`}
                      className={cn(
                        "h-8 w-[4.5rem] sm:w-24",
                        d.affiliate.trim() !== (p.affiliatePrice == null ? "" : String(p.affiliatePrice)) &&
                          "border-primary",
                      )}
                    />
                  </td>
                )}
                {show("sizes") && (
                  <td className="px-1.5 py-2 sm:px-2">
                    <Input
                      data-bulk-cell={`sizes-${i}`}
                      value={d.sizes}
                      onChange={(e) => patch(p.id, { sizes: e.target.value })}
                      onKeyDown={(e) => handleEnter(e, "sizes", i)}
                      placeholder="None"
                      aria-label={`Sizes for ${productName(p)}, separated by commas`}
                      className={cn(
                        "h-8 w-32 sm:w-40",
                        !sameOptions(optionsOf(d.sizes), p.sizes) && "border-primary",
                      )}
                    />
                  </td>
                )}
                {show("colors") && (
                  <td className="px-1.5 py-2 sm:px-2">
                    <Input
                      data-bulk-cell={`colors-${i}`}
                      value={d.colors}
                      onChange={(e) => patch(p.id, { colors: e.target.value })}
                      onKeyDown={(e) => handleEnter(e, "colors", i)}
                      placeholder="None"
                      aria-label={`Colors for ${productName(p)}, separated by commas`}
                      className={cn(
                        "h-8 w-32 sm:w-40",
                        !sameOptions(optionsOf(d.colors), p.colors) && "border-primary",
                      )}
                    />
                  </td>
                )}
                {show("live") && (
                  <td className="px-1.5 py-2 sm:px-2 pr-4">
                    <Switch
                      checked={d.isActive}
                      onCheckedChange={(checked) => patch(p.id, { isActive: checked })}
                      aria-label={`${productName(p)} is live`}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DialogFooter className="m-0 flex-row items-center justify-between gap-2 rounded-none border-t p-4 sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {errors.length > 0 ? (
            <span className="text-destructive">
              Fix {errors.length} product{errors.length === 1 ? "" : "s"} to save
            </span>
          ) : changed.length === 0 ? (
            "No changes yet"
          ) : (
            `${changed.length} product${changed.length === 1 ? "" : "s"} changed`
          )}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={saving || changed.length === 0 || errors.length > 0}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

// The "Set all" box for sizes or colors: Replace gives every product exactly
// these; Add keeps each product's own and adds these to them.
function OptionsSetAll({
  value,
  onChange,
  placeholder,
  onReplace,
  onAdd,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onReplace: () => void;
  onAdd: () => void;
}) {
  const empty = optionsOf(value).length === 0;
  return (
    <td className="px-1.5 py-2 sm:px-2">
      <div className="flex flex-col gap-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 w-32 sm:w-40"
        />
        <div className="flex gap-1">
          <Button type="button" size="xs" variant="outline" disabled={empty} onClick={onReplace}>
            Replace
          </Button>
          <Button type="button" size="xs" variant="outline" disabled={empty} onClick={onAdd}>
            Add
          </Button>
        </div>
      </div>
    </td>
  );
}
