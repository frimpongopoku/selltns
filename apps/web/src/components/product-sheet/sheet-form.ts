import { priceInput, toPesewas } from "@/lib/money";
import type { SheetChanges, SheetProduct } from "@/lib/types";

// The editor's working copy of a product. Prices are typed in cedis.
export interface SheetForm {
  title: string;
  description: string;
  price: string;
  sale: string;
  stock: string;
  trackStock: boolean;
  sizes: string[];
  colors: string[];
  isActive: boolean;
  images: string[];
}

export const EMPTY_FORM: SheetForm = {
  title: "",
  description: "",
  price: "",
  sale: "",
  stock: "0",
  trackStock: true,
  sizes: [],
  colors: [],
  isActive: true,
  images: [],
};

/** A live product with the team's suggested changes laid on top. */
export function withChanges(
  product: SheetProduct,
  changes: SheetChanges | undefined,
): SheetProduct {
  return { ...product, ...(changes ?? {}) } as SheetProduct;
}

export function formOf(p: Partial<SheetProduct> & SheetChanges): SheetForm {
  return {
    title: p.title ?? "",
    description: p.description ?? "",
    price: priceInput(p.price),
    sale: priceInput(p.discountPrice),
    stock: String(p.stock ?? 0),
    trackStock: p.trackStock ?? true,
    sizes: p.sizes ?? [],
    colors: p.colors ?? [],
    isActive: p.isActive ?? true,
    images: p.images ?? [],
  };
}

/** The form as API changes, or an error message to show instead. */
export function changesOf(
  form: SheetForm,
  withImages: boolean,
): { changes?: SheetChanges; error?: string } {
  const price = toPesewas(form.price);
  if (price === null) return { error: "Enter a price, like 50 or 4.99" };
  const sale = form.sale.trim() === "" ? null : toPesewas(form.sale);
  if (form.sale.trim() !== "" && (sale === null || sale <= 0)) {
    return { error: "Enter a sale price, like 40 or 3.99, or leave it empty" };
  }
  if (sale !== null && sale >= price)
    return { error: "The sale price must be lower than the price" };
  if (form.trackStock && !/^\d+$/.test(form.stock.trim()))
    return { error: "Stock must be a whole number" };
  return {
    changes: {
      title: form.title.trim(),
      description: form.description.trim(),
      price,
      discountPrice: sale,
      // Stock only matters while it's tracked — left alone otherwise.
      stock: form.trackStock ? Number(form.stock) : undefined,
      trackStock: form.trackStock,
      sizes: form.sizes,
      colors: form.colors,
      isActive: form.isActive,
      ...(withImages ? { images: form.images } : {}),
    },
  };
}
