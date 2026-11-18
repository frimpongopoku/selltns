"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { COLOR_PRESETS, SIZE_PRESETS, swatchFor } from "@/lib/drop-options";
import { cn } from "@/lib/utils";

// Big tap-friendly chips for picking sizes or colors, with "+" to add a
// custom one. Shared by the team pages (Photo Drop, product sheet).
export function ChipGroup({
  label,
  options,
  selected,
  onChange,
  addLabel,
  rounded = false,
  onRemove,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  rounded?: boolean;
  // Shown as a "Remove" link next to the label: clears and hides the group.
  onRemove?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const isOn = (option: string) => selected.some((s) => s.toLowerCase() === option.toLowerCase());

  function toggle(option: string) {
    onChange(isOn(option) ? selected.filter((s) => s.toLowerCase() !== option.toLowerCase()) : [...selected, option]);
  }

  function addCustom() {
    const value = draft.trim().slice(0, 30);
    if (value && !isOn(value)) onChange([...selected, value]);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="-my-2 px-1 py-2 text-sm font-medium text-muted-foreground"
          >
            Remove
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = isOn(option);
          const swatch = rounded ? swatchFor(option) : null;
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={on}
              className={cn(
                "flex h-11 min-w-12 items-center justify-center gap-2 border px-3 text-sm font-semibold transition-colors",
                rounded ? "rounded-full" : "rounded-xl",
                rounded && swatch && "pl-2",
                on ? "border-foreground bg-foreground text-background" : "bg-background",
              )}
            >
              {swatch && (
                <span
                  className="size-5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                  style={{ background: swatch }}
                />
              )}
              {option}
            </button>
          );
        })}
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCustom();
            }}
            className="flex gap-1.5"
          >
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={addCustom}
              placeholder={addLabel}
              className="h-11 w-36 text-base"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label={addLabel}
            className={cn(
              "flex size-11 items-center justify-center border border-dashed border-muted-foreground/50 text-muted-foreground",
              rounded ? "rounded-full" : "rounded-xl",
            )}
          >
            <Plus className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Sizes and colors are only for items that come in them (clothes, shoes…).
// Each group stays hidden behind an "Add sizes" / "Add colors" button until
// it's wanted, so a bag or a perfume only asks for a price.
export function SizeColorPickers({
  sizes,
  colors,
  onSizesChange,
  onColorsChange,
}: {
  sizes: string[];
  colors: string[];
  onSizesChange: (next: string[]) => void;
  onColorsChange: (next: string[]) => void;
}) {
  const [openSizes, setShowSizes] = useState(sizes.length > 0);
  const [openColors, setShowColors] = useState(colors.length > 0);
  // A group with values always shows, so nothing hides behind the button.
  const showSizes = openSizes || sizes.length > 0;
  const showColors = openColors || colors.length > 0;

  const sizeOptions = [
    ...SIZE_PRESETS,
    ...sizes.filter((s) => !SIZE_PRESETS.some((p) => p.toLowerCase() === s.toLowerCase())),
  ];
  const colorOptions = [...COLOR_PRESETS.map((c) => c.label), ...colors.filter((c) => !swatchFor(c))];

  return (
    <>
      {showSizes && (
        <ChipGroup
          label="Sizes available"
          options={sizeOptions}
          selected={sizes}
          onChange={onSizesChange}
          addLabel="Add a size"
          onRemove={() => {
            onSizesChange([]);
            setShowSizes(false);
          }}
        />
      )}
      {showColors && (
        <ChipGroup
          label="Colors"
          options={colorOptions}
          selected={colors}
          onChange={onColorsChange}
          addLabel="Add a color"
          rounded
          onRemove={() => {
            onColorsChange([]);
            setShowColors(false);
          }}
        />
      )}
      {(!showSizes || !showColors) && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {!showSizes && <AddGroupButton label="Add sizes" onClick={() => setShowSizes(true)} />}
            {!showColors && <AddGroupButton label="Add colors" onClick={() => setShowColors(true)} />}
          </div>
          {!showSizes && !showColors && (
            <p className="text-sm text-muted-foreground">Only if it comes in different sizes or colors.</p>
          )}
        </div>
      )}
    </>
  );
}

function AddGroupButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center gap-1.5 rounded-xl border border-dashed border-muted-foreground/50 px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.97]"
    >
      <Plus className="size-4" />
      {label}
    </button>
  );
}
