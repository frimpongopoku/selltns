import type { Collection, MediaAsset, Product } from "./types";

// Where a cropped photo frame (product card, thumbnail, gallery tile) sits
// over the full photo, as a CSS object-position. The photo itself is never
// cut — this only picks which part shows inside the frame.
//
// Photos without a focus point stay top-anchored, as they always were.
export const DEFAULT_POSITION = "50% 0%";

export interface Focus {
  x: number;
  y: number;
}

export function positionOf(focus: Focus | null | undefined): string {
  return focus ? `${focus.x}% ${focus.y}%` : DEFAULT_POSITION;
}

export function assetFocus(asset: Pick<MediaAsset, "focusX" | "focusY">): Focus | null {
  return asset.focusX != null && asset.focusY != null ? { x: asset.focusX, y: asset.focusY } : null;
}

export function assetPosition(asset: Pick<MediaAsset, "focusX" | "focusY">): string {
  return positionOf(assetFocus(asset));
}

export function productImagePosition(product: Pick<Product, "imageFocus">, url: string): string {
  return product.imageFocus?.[url] ?? DEFAULT_POSITION;
}

export const FOCUS_PRESETS: { label: string; focus: Focus }[] = [
  { label: "Top", focus: { x: 50, y: 0 } },
  { label: "Center", focus: { x: 50, y: 50 } },
  { label: "Bottom", focus: { x: 50, y: 100 } },
];

export function coverPosition(collection: Pick<Collection, "coverPosition">): string {
  return collection.coverPosition ?? DEFAULT_POSITION;
}
