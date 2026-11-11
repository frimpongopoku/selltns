"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { swatchFor } from "@/lib/drop-options";
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
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  rounded?: boolean;
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
      <span className="text-sm font-semibold">{label}</span>
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
