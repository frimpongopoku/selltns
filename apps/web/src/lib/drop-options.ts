// Quick-pick chips for Photo Drop's details screen. Anything else can be
// typed in as a custom size/color.
export const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "Free size"];

export const COLOR_PRESETS: { label: string; swatch: string }[] = [
  { label: "Black", swatch: "#18181b" },
  { label: "White", swatch: "#ffffff" },
  { label: "Red", swatch: "#dc2626" },
  { label: "Blue", swatch: "#2563eb" },
  { label: "Green", swatch: "#16a34a" },
  { label: "Pink", swatch: "#f472b6" },
  { label: "Yellow", swatch: "#facc15" },
  { label: "Brown", swatch: "#92400e" },
  { label: "Beige", swatch: "#e7d8c3" },
  { label: "Grey", swatch: "#9ca3af" },
];

export function swatchFor(color: string): string | null {
  return COLOR_PRESETS.find((c) => c.label.toLowerCase() === color.toLowerCase())?.swatch ?? null;
}
