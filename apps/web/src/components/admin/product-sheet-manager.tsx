"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Copy,
  Link2,
  ListChecks,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductPickerDialog } from "@/components/admin/product-picker-dialog";
import {
  discardSheetSuggestions,
  getProductSheetAdmin,
  getProductSheetScopeProducts,
  publishSheetSuggestions,
  regenerateProductSheetLink,
  setProductSheetEnabled,
  setProductSheetScope,
} from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";
import { DEFAULT_POSITION } from "@/lib/image-focus";
import { cn } from "@/lib/utils";
import type {
  Product,
  ProductSheetAdmin,
  SheetChanges,
  SheetProduct,
} from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";
const REFRESH_MS = 30_000;

type Suggestion = ProductSheetAdmin["suggestions"][number];
type Filter = "all" | "edits" | "new";
type FieldKey = keyof Omit<SheetChanges, "images">;

const FIELD_LABELS: Record<FieldKey, string> = {
  title: "Name",
  price: "Price",
  discountPrice: "Sale price",
  stock: "Stock",
  trackStock: "Stock tracking",
  sizes: "Sizes",
  colors: "Colors",
  isActive: "On the shop",
  description: "Description",
};
const FIELD_ORDER = Object.keys(FIELD_LABELS) as FieldKey[];

function show(field: FieldKey, value: unknown): string {
  switch (field) {
    case "price":
      return formatMoney(value as number);
    case "discountPrice":
      return value == null ? "No sale" : formatMoney(value as number);
    case "stock":
      return String(value);
    case "trackStock":
      return value ? "Counted" : "Always in stock";
    case "sizes":
    case "colors":
      return (value as string[]).length
        ? (value as string[]).join(", ")
        : "None";
    case "isActive":
      return value ? "Shown" : "Hidden";
    case "title":
      return (value as string) || "No name";
    case "description":
      return (value as string) || "No description";
  }
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

// Admin side of the product sheet: share/switch off the team link, choose
// which products it shows, and review what the team suggested — publish it
// to the live shop or discard it.
export function ProductSheetManager({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<ProductSheetAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<
    "publish" | "discard" | "link" | "scope" | null
  >(null);
  const [confirm, setConfirm] = useState<"regenerate" | "discard" | null>(null);
  const [discardIds, setDiscardIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scopeProducts, setScopeProducts] = useState<Product[] | null>(null);

  const load = useCallback(
    () =>
      getProductSheetAdmin()
        .then((next) => {
          setData(next);
          const present = new Set(next.suggestions.map((s) => s.id));
          setSelected(
            (prev) => new Set([...prev].filter((id) => present.has(id))),
          );
        })
        .catch(() => toast.error("Couldn't load the product sheet"))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // New suggestions show up on their own unless the admin is mid-selection.
  useEffect(() => {
    if (selected.size > 0 || confirm || pickerOpen) return;
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, selected.size, confirm, pickerOpen]);

  const link = data?.link;
  const url = link?.token ? `${SITE_URL}/sheet/${link.token}` : null;
  const suggestions = data?.suggestions ?? [];
  const edits = suggestions.filter((s) => s.productId);
  const added = suggestions.filter((s) => !s.productId);
  const visible =
    filter === "all" ? suggestions : filter === "edits" ? edits : added;
  const allVisibleSelected =
    visible.length > 0 && visible.every((s) => selected.has(s.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleToggleLink(enabled: boolean) {
    setBusy("link");
    try {
      const next = await setProductSheetEnabled(enabled);
      setData((prev) => prev && { ...prev, link: { ...prev.link, ...next } });
      toast.success(
        enabled
          ? "Team link is on"
          : "Team link is off — it won't open until you turn it back on",
      );
    } catch {
      toast.error("Couldn't change the link");
    } finally {
      setBusy(null);
    }
  }

  async function handleRegenerate() {
    setBusy("link");
    try {
      const next = await regenerateProductSheetLink();
      setData((prev) => prev && { ...prev, link: { ...prev.link, ...next } });
      toast.success("New link ready — the old one no longer works");
      setConfirm(null);
    } catch {
      toast.error("Couldn't make a new link");
    } finally {
      setBusy(null);
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied — paste it in your team chat");
  }

  async function saveScope(allProducts: boolean, products: Product[]) {
    if (!allProducts && products.length === 0) {
      toast.error("Choose at least one product, or show all products");
      return;
    }
    setBusy("scope");
    try {
      const next = await setProductSheetScope(
        allProducts,
        products.map((p) => p.id),
      );
      setData((prev) => prev && { ...prev, link: { ...prev.link, ...next } });
      setScopeProducts(products);
      toast.success(
        allProducts
          ? "The sheet shows all your products"
          : `The sheet shows ${next.productIds.length} products`,
      );
    } catch (err) {
      toast.error((err as Error).message || "Couldn't save that");
    } finally {
      setBusy(null);
    }
  }

  async function openPicker() {
    if (scopeProducts === null) {
      try {
        setScopeProducts(
          link?.allProducts ? [] : await getProductSheetScopeProducts(),
        );
      } catch {
        toast.error("Couldn't load the products on the sheet");
        return;
      }
    }
    setPickerOpen(true);
  }

  async function handlePublish(ids: string[]) {
    setBusy("publish");
    try {
      const { published, failed } = await publishSheetSuggestions(ids);
      if (published > 0)
        toast.success(
          `Published ${published} change${published === 1 ? "" : "s"} to your shop`,
        );
      if (failed.length > 0) {
        toast.error(`${failed.length} couldn't be published`, {
          description: failed[0].error,
        });
      }
      setSelected(new Set());
      await load();
    } catch {
      toast.error("Couldn't publish those");
    } finally {
      setBusy(null);
    }
  }

  async function handleDiscard(ids: string[]) {
    setBusy("discard");
    try {
      const { discarded } = await discardSheetSuggestions(ids);
      toast.success(
        `Discarded ${discarded} change${discarded === 1 ? "" : "s"}`,
      );
      setSelected(
        (prev) => new Set([...prev].filter((id) => !ids.includes(id))),
      );
      setConfirm(null);
      await load();
    } catch {
      toast.error("Couldn't discard those");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn(selected.size > 0 && "pb-28")}>
      <section className="rounded-xl border p-4">
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : !link?.token ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-xl">
              <p className="font-medium">Team link</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Turn it on to get a link your team can open on their phones — no
                login. They change names, prices, stock, sizes and colors, and
                add new products from your gallery. All your products are on it
                to start; you can limit it to some once the link is on. You
                review everything here before it goes live.
              </p>
            </div>
            <Button
              onClick={() => handleToggleLink(true)}
              disabled={busy === "link"}
              className="gap-1.5"
            >
              <Link2 className="h-4 w-4" />
              Turn on team link
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-[999_1_320px]">
                <p className="text-sm font-medium">Team link</p>
                <div className="mt-1.5 flex gap-2">
                  <div
                    className={cn(
                      "flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border bg-muted/50 px-3 text-sm",
                      !link.enabled && "text-muted-foreground line-through",
                    )}
                  >
                    {url}
                  </div>
                  <Button
                    onClick={handleCopy}
                    disabled={!link.enabled}
                    className="gap-1.5"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  No login needed. Anyone with this link can suggest changes;
                  nothing goes live until you publish it.
                </p>
              </div>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={link.enabled}
                    onCheckedChange={handleToggleLink}
                    disabled={busy === "link"}
                  />
                  {link.enabled ? "Link is on" : "Link is off"}
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirm("regenerate")}
                >
                  Make a new link
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div>
                <p className="text-sm font-medium">Products on the sheet</p>
                <p className="text-sm text-muted-foreground">
                  {link.allProducts
                    ? "All your products, including new ones you add later."
                    : `${link.productIds.length} product${link.productIds.length === 1 ? "" : "s"} you chose.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!link.allProducts && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void saveScope(true, [])}
                    disabled={busy === "scope"}
                  >
                    Show all products
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void openPicker()}
                  disabled={busy === "scope"}
                  className="gap-1.5"
                >
                  {busy === "scope" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ListChecks className="h-4 w-4" />
                  )}
                  {link.allProducts
                    ? "Only some products…"
                    : "Change products…"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All ${suggestions.length}`],
              ["edits", `Edits ${edits.length}`],
              ["new", `New products ${added.length}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "h-8 rounded-full border px-3 text-sm font-medium",
                filter === value
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void load()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {visible.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  visible.forEach((s) =>
                    allVisibleSelected ? next.delete(s.id) : next.add(s.id),
                  );
                  return next;
                })
              }
            >
              {allVisibleSelected ? "Unselect all" : "Select all"}
            </Button>
          )}
        </div>
      </div>

      {!loading && visible.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Nothing to review</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes and new products from your team show up here.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {visible.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              selected={selected.has(s.id)}
              onToggle={() => toggle(s.id)}
              busy={busy !== null}
              onPublish={() => void handlePublish([s.id])}
              onDiscard={() => {
                setDiscardIds([s.id]);
                setConfirm("discard");
              }}
            />
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6"
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelected(new Set())}
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </Button>
              <p className="text-sm font-medium">{selected.size} selected</p>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDiscardIds([...selected]);
                  setConfirm("discard");
                }}
                disabled={busy !== null}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => void handlePublish([...selected])}
                disabled={busy !== null}
                className="gap-1.5"
              >
                {busy === "publish" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Publish {selected.size}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProductPickerDialog
        tenantId={tenantId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={scopeProducts ?? []}
        onDone={(products) => void saveScope(false, products)}
        title="Products on the sheet"
        pickedLabel="On the sheet"
        allowInactive
      />

      <Dialog
        open={confirm === "discard"}
        onOpenChange={(open) => busy === null && !open && setConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Discard{" "}
              {discardIds.length === 1
                ? "this change"
                : `${discardIds.length} changes`}
              ?
            </DialogTitle>
            <DialogDescription>
              Your shop stays as it is. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirm(null)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDiscard(discardIds)}
              disabled={busy !== null}
            >
              {busy === "discard" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirm === "regenerate"}
        onOpenChange={(open) => busy === null && !open && setConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Make a new link?</DialogTitle>
            <DialogDescription>
              The current link stops working straight away — you&apos;ll need to
              send the new one to your team. Changes already suggested stay
              here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirm(null)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={busy !== null}
              className="gap-1.5"
            >
              {busy === "link" && <Loader2 className="h-4 w-4 animate-spin" />}
              Make new link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  selected,
  onToggle,
  busy,
  onPublish,
  onDiscard,
}: {
  suggestion: Suggestion;
  selected: boolean;
  onToggle: () => void;
  busy: boolean;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  const { product, changes, base } = suggestion;
  const isNew = !suggestion.productId;
  const images = isNew ? (changes.images ?? []) : (product?.images ?? []);
  const cover = images[0];
  const name = isNew
    ? changes.title || "New product (no name)"
    : product?.title || (product ? `Item #${product.number}` : "Product");

  return (
    <div
      className={cn(
        "rounded-xl border p-3 sm:p-4",
        selected && "border-foreground ring-1 ring-foreground",
      )}
    >
      <div className="flex gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${name}`}
          className="mt-1"
        />
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-20">
          {cover && (
            <Image
              src={cover}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              style={{
                objectPosition: product?.imageFocus[cover] ?? DEFAULT_POSITION,
              }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                isNew
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-amber-100 text-amber-900",
              )}
            >
              {isNew ? "New product" : "Edit"}
            </span>
            <p className="min-w-0 truncate font-medium">{name}</p>
            {product && product.title && (
              <span className="text-xs text-muted-foreground">
                #{product.number}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {suggestion.author ? `${suggestion.author} · ` : ""}
            {formatDateTime(suggestion.updatedAt)}
          </p>
          {isNew ? (
            <NewDetails changes={changes} images={images} />
          ) : (
            product && (
              <EditDetails product={product} changes={changes} base={base} />
            )
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={busy}
          className="text-muted-foreground"
        >
          Discard
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onPublish}
          disabled={busy}
          className="gap-1.5"
        >
          <Check className="h-4 w-4" />
          Publish
        </Button>
      </div>
    </div>
  );
}

function EditDetails({
  product,
  changes,
  base,
}: {
  product: SheetProduct;
  changes: SheetChanges;
  base: SheetChanges;
}) {
  const fields = FIELD_ORDER.filter((f) => changes[f] !== undefined);
  return (
    <div className="mt-2.5 overflow-hidden rounded-lg border text-sm">
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <span>Field</span>
        <span>Live now</span>
        <span>Suggested</span>
      </div>
      {fields.map((field) => {
        const liveValue = product[field];
        // The shop changed this field after the team edited it.
        const moved = field in base && !same(base[field], liveValue);
        return (
          <div
            key={field}
            className="grid grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 border-t px-3 py-2"
          >
            <span className="text-muted-foreground">{FIELD_LABELS[field]}</span>
            <span className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">
              <Value field={field} value={liveValue} />
              {moved && (
                <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Changed since they edited (was {show(field, base[field])})
                </span>
              )}
            </span>
            <Value
              field={field}
              value={changes[field]}
              className="font-medium"
            />
          </div>
        );
      })}
    </div>
  );
}

function NewDetails({
  changes,
  images,
}: {
  changes: SheetChanges;
  images: string[];
}) {
  const rows = FIELD_ORDER.filter(
    (f) => f !== "title" && changes[f] !== undefined,
  );
  return (
    <div className="mt-2.5 flex flex-col gap-2">
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {images.slice(1).map((url) => (
            <div
              key={url}
              className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map((field) => (
          <div key={field} className="contents">
            <dt className="text-muted-foreground">{FIELD_LABELS[field]}</dt>
            <dd className="min-w-0">
              <Value field={field} value={changes[field]} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Long descriptions keep their line breaks and scroll inside a capped box so
// one card can't grow to the height of the page.
function Value({
  field,
  value,
  className,
}: {
  field: FieldKey;
  value: unknown;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block [overflow-wrap:anywhere]",
        field === "description" &&
          "max-h-40 overflow-y-auto whitespace-pre-line",
        className,
      )}
    >
      {show(field, value)}
    </span>
  );
}
