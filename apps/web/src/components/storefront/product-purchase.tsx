"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "./add-to-cart-button";

// The product page's buy box: size/color pickers (when the product offers
// them) above the add-to-cart button. A single offered option is picked
// for the customer — there's no real choice to make.
export function ProductPurchase({ product }: { product: Product }) {
  // `?? []` guards against product data from an API that predates options.
  const sizes = product.sizes ?? [];
  const colors = product.colors ?? [];
  const [size, setSize] = useState<string | null>(
    sizes.length === 1 ? sizes[0] : null,
  );
  const [color, setColor] = useState<string | null>(
    colors.length === 1 ? colors[0] : null,
  );
  const missingOption =
    sizes.length > 0 && !size
      ? "Choose a size"
      : colors.length > 0 && !color
        ? "Choose a color"
        : null;

  return (
    <div className="flex flex-col gap-6">
      {sizes.length > 0 && (
        <OptionPicker label="Size" options={sizes} value={size} onChange={setSize} />
      )}
      {colors.length > 0 && (
        <OptionPicker label="Color" options={colors} value={color} onChange={setColor} />
      )}
      <AddToCartButton product={product} options={{ size, color }} missingOption={missingOption} />
    </div>
  );
}

function OptionPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm">
        {label}
        {value && <span className="store-muted">: {value}</span>}
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={selected}
              className={`store-card min-w-11 px-3.5 py-2 text-sm transition-colors ${
                selected
                  ? "border-[var(--store-fg)] ring-1 ring-[var(--store-fg)]"
                  : "hover:bg-[var(--store-hover-bg)]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
