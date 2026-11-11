"use client";

import { ProductSheetHelp } from "./product-sheet-help";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, PackagePlus, Pencil, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getSheetProducts,
  removeSheetNew,
  saveSheetEdit,
  saveSheetNew,
  undoSheetEdit,
} from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { DEFAULT_POSITION } from "@/lib/image-focus";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { cn } from "@/lib/utils";
import type {
  ProductSheetPublic,
  SheetChanges,
  SheetProduct,
  SheetProductRow,
  SheetSuggestion,
} from "@/lib/types";
import { usePaged } from "./use-paged";
import { EMPTY_FORM, formOf, withChanges } from "./sheet-form";
import { SheetEditor } from "./sheet-editor";
import { SheetGalleryPicker } from "./sheet-gallery-picker";

type Tab = "products" | "new";
type Editing =
  { kind: "product"; id: string } | { kind: "new"; id: string | null } | null;

const AUTHOR_KEY = "selltns-sheet-author";

// The team's side of the product sheet: a no-login page, built for phones,
// for suggesting changes to the shop's products and adding new ones from
// gallery photos. Nothing here goes live until the shop's admin publishes it.
export function ProductSheetApp({
  token,
  initial,
}: {
  token: string;
  initial: ProductSheetPublic;
}) {
  const [tab, setTab] = useState<Tab>("products");
  const [author, setAuthor] = useState("");
  const [newProducts, setNewProducts] = useState<SheetSuggestion[]>(
    initial.newProducts,
  );
  const [editing, setEditing] = useState<Editing>(null);
  // Focus of gallery photos picked this visit, for thumbnails.
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<{ initial: string[] } | null>(null);
  const pickerResolve = useRef<((urls: string[] | null) => void) | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount, so the server render matches
      setAuthor(window.localStorage.getItem(AUTHOR_KEY) ?? "");
    } catch {
      // storage blocked — the name is optional anyway
    }
  }, []);
  function changeAuthor(value: string) {
    setAuthor(value);
    try {
      window.localStorage.setItem(AUTHOR_KEY, value);
    } catch {
      // ignore
    }
  }

  const fetchPage = useCallback(
    (params: { cursor?: string | null; q?: string }) =>
      getSheetProducts(token, params),
    [token],
  );
  const products = usePaged<SheetProductRow>(fetchPage);
  const sentinelRef = useInfiniteScroll({
    onIntersect: products.loadMore,
    enabled: products.hasMore && !products.loading && tab === "products",
  });
  const editedCount = products.items.filter((p) => p.suggestion).length;

  function pickPhotos(current: string[]) {
    setPicker({ initial: current });
    return new Promise<string[] | null>((resolve) => {
      pickerResolve.current = resolve;
    });
  }

  // ---- Editing a live product --------------------------------------------

  const editIndex =
    editing?.kind === "product"
      ? products.items.findIndex((p) => p.id === editing.id)
      : -1;
  const editRow = editIndex >= 0 ? products.items[editIndex] : null;

  function patchRow(id: string, suggestion: SheetSuggestion | null) {
    products.setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, suggestion } : p)),
    );
  }

  function nextProduct() {
    const next = products.items[editIndex + 1];
    setEditing(next ? { kind: "product", id: next.id } : null);
    if (!next) toast.success("That's the last one loaded");
  }

  async function saveProduct(row: SheetProductRow, changes: SheetChanges) {
    const suggestion = await saveSheetEdit(token, row.id, changes, author);
    patchRow(row.id, suggestion);
    toast.success(
      suggestion ? "Saved for review" : "No changes — matches the shop",
    );
    nextProduct();
  }

  async function undoProduct(row: SheetProductRow) {
    await undoSheetEdit(token, row.id);
    patchRow(row.id, null);
    toast.success("Your changes were taken back");
    setEditing(null);
  }

  // ---- New products -------------------------------------------------------

  const editNew =
    editing?.kind === "new"
      ? (newProducts.find((s) => s.id === editing.id) ?? null)
      : null;

  async function saveNew(id: string | null, changes: SheetChanges) {
    const saved = await saveSheetNew(token, id, changes, author);
    setNewProducts((prev) =>
      id ? prev.map((s) => (s.id === id ? saved : s)) : [saved, ...prev],
    );
    toast.success(id ? "Saved for review" : "New product added for review");
    setEditing(null);
  }

  async function deleteNew(id: string) {
    await removeSheetNew(token, id);
    setNewProducts((prev) => prev.filter((s) => s.id !== id));
    toast.success("Deleted");
    setEditing(null);
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-x-clip bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-4 pb-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {initial.shop.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- tiny logo from the shop's own storage
              <img
                src={initial.shop.logoUrl}
                alt=""
                className="size-11 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                {initial.shop.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading truncate text-lg leading-tight font-semibold">
                {initial.shop.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Product sheet · changes go to the shop for review
              </p>
            </div>
            <ProductSheetHelp
              audience="team"
              shopName={initial.shop.name}
              trigger="icon"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex rounded-xl border bg-muted/50 p-1 text-sm font-semibold">
              {(
                [
                  {
                    value: "products",
                    label: "Products",
                    count: editedCount,
                    hint: "edited",
                  },
                  {
                    value: "new",
                    label: "New products",
                    count: newProducts.length,
                    hint: "",
                  },
                ] as const
              ).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 transition-colors sm:flex-none",
                    tab === t.value
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-900">
                      {t.count}
                      {t.hint && ` ${t.hint}`}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Input
              value={author}
              onChange={(e) => changeAuthor(e.target.value)}
              placeholder="Your name (optional)"
              maxLength={60}
              className="h-10 sm:ml-auto sm:w-56"
              aria-label="Your name, shown to the shop with your changes"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-16 sm:px-6">
        {tab === "products" ? (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={products.query}
                onChange={(e) => products.setQuery(e.target.value)}
                placeholder="Search by name, tag or number…"
                className="h-11 bg-background pl-9 text-base"
              />
            </div>
            {products.loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : products.items.length === 0 ? (
              <p className="p-12 text-center text-sm text-muted-foreground">
                {products.query
                  ? "No products match your search."
                  : "No products on this sheet yet."}
              </p>
            ) : (
              <>
                <p className="mt-3 mb-2 text-xs text-muted-foreground">
                  Tap a product to change it.
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
                  {products.items.map((row) => (
                    <ProductTile
                      key={row.id}
                      product={withChanges(row, row.suggestion?.changes)}
                      edited={!!row.suggestion}
                      onClick={() =>
                        setEditing({ kind: "product", id: row.id })
                      }
                    />
                  ))}
                </div>
                <div ref={sentinelRef} className="flex justify-center p-4">
                  {products.loadingMore && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing({ kind: "new", id: null })}
              className="flex h-16 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/10 text-base font-semibold hover:bg-primary/15 sm:h-14"
            >
              <PackagePlus className="size-5" />
              Add a new product
            </button>
            {newProducts.length === 0 ? (
              <p className="p-12 text-center text-sm text-muted-foreground">
                New products you add show here until the shop reviews them.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
                {newProducts.map((s) => (
                  <ProductTile
                    key={s.id}
                    product={{ ...newAsProduct(s.changes), id: s.id }}
                    positions={positions}
                    edited
                    editedLabel="New"
                    onClick={() => setEditing({ kind: "new", id: s.id })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {editRow && (
        <SheetEditor
          key={editRow.id}
          heading={editRow.title || `Item #${editRow.number}`}
          progress={(editIndex + 1) / products.items.length}
          initial={formOf(withChanges(editRow, editRow.suggestion?.changes))}
          live={editRow}
          positions={editRow.imageFocus}
          onSave={(changes) => saveProduct(editRow, changes)}
          onUndo={editRow.suggestion ? () => undoProduct(editRow) : undefined}
          onSkip={nextProduct}
          onClose={() => setEditing(null)}
          saveLabel="Save & next"
        />
      )}

      {editing?.kind === "new" && (editing.id === null || editNew) && (
        <SheetEditor
          key={editing.id ?? "new"}
          heading={editNew ? "New product" : "Add a new product"}
          initial={editNew ? formOf(editNew.changes) : EMPTY_FORM}
          positions={positions}
          onPickPhotos={pickPhotos}
          onSave={(changes) => saveNew(editing.id, changes)}
          onDelete={editNew ? () => deleteNew(editNew.id) : undefined}
          onClose={() => setEditing(null)}
          saveLabel={editNew ? "Save" : "Add for review"}
        />
      )}

      <SheetGalleryPicker
        token={token}
        open={picker !== null}
        initial={picker?.initial ?? []}
        onDone={(urls, picked) => {
          setPositions((prev) => ({ ...prev, ...picked }));
          pickerResolve.current?.(urls);
          setPicker(null);
        }}
        onCancel={() => {
          pickerResolve.current?.(null);
          setPicker(null);
        }}
      />
    </main>
  );
}

function newAsProduct(changes: SheetChanges): SheetProduct {
  return {
    id: "",
    number: 0,
    title: changes.title ?? "",
    description: changes.description ?? "",
    price: changes.price ?? 0,
    discountPrice: changes.discountPrice ?? null,
    stock: changes.stock ?? 0,
    trackStock: changes.trackStock ?? true,
    sizes: changes.sizes ?? [],
    colors: changes.colors ?? [],
    isActive: changes.isActive ?? true,
    images: changes.images ?? [],
    imageFocus: {},
  };
}

function ProductTile({
  product,
  edited,
  editedLabel = "Edited",
  positions,
  onClick,
}: {
  product: SheetProduct;
  edited: boolean;
  editedLabel?: string;
  positions?: Record<string, string>;
  onClick: () => void;
}) {
  const image = product.images[0];
  const position = image
    ? (positions?.[image] ?? product.imageFocus[image] ?? DEFAULT_POSITION)
    : DEFAULT_POSITION;
  const onSale =
    product.discountPrice != null && product.discountPrice < product.price;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-background text-left transition-colors hover:border-foreground/40",
        edited && "border-amber-400",
      )}
    >
      <div className="relative aspect-square w-full bg-muted">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className={cn(
              "object-cover",
              !product.isActive && "opacity-50 grayscale",
            )}
            style={{ objectPosition: position }}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <Plus className="size-6" />
          </span>
        )}
        {edited && (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-900">
            <Pencil className="size-3" />
            {editedLabel}
          </span>
        )}
        {!product.isActive && (
          <span className="absolute right-1.5 bottom-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
            Hidden
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 p-2.5">
        <p
          className={cn(
            "truncate text-sm font-medium",
            !product.title && "text-muted-foreground",
          )}
        >
          {product.title ||
            (product.number ? `#${product.number}` : "No name yet")}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
          <span className="font-semibold">
            {formatMoney(onSale ? product.discountPrice! : product.price)}
          </span>
          {onSale && (
            <span className="text-xs text-muted-foreground line-through">
              {formatMoney(product.price)}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {product.trackStock ? `${product.stock} in stock` : "Always in stock"}
          {product.sizes.length > 0 && ` · ${product.sizes.join(" ")}`}
        </p>
      </div>
    </button>
  );
}
