"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeScope } from "@/components/theme/theme-scope";
import { updateTenantTheme } from "@/lib/api";
import { PALETTE_SWATCHES, THEME_PRESETS, THEME_TEMPLATE_META } from "@/lib/theme-presets";
import type { ThemeTemplate, ThemeTokens } from "@/lib/types";

export function ThemePicker({ current }: { current: ThemeTokens }) {
  const router = useRouter();
  const [template, setTemplate] = useState<ThemeTemplate>(current.template);
  const [palette, setPalette] = useState(0);
  const [saving, setSaving] = useState(false);

  const swatch = PALETTE_SWATCHES[template][palette];
  const preview: ThemeTokens = {
    ...THEME_PRESETS[template],
    primary: swatch.primary,
    accent: swatch.accent,
  };

  async function handleSave() {
    setSaving(true);
    try {
      await updateTenantTheme(preview);
      toast.success("Storefront theme updated");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.keys(THEME_TEMPLATE_META) as ThemeTemplate[]).map((key) => {
            const isSelected = template === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTemplate(key);
                  setPalette(0);
                }}
                className={`relative rounded-lg border-2 p-5 text-left transition-all duration-150 active:scale-[0.98] ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/50 hover:bg-muted"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 flex h-5 w-5 animate-in zoom-in-50 items-center justify-center rounded-full bg-primary text-primary-foreground duration-150">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <p className="pr-6 font-medium">{THEME_TEMPLATE_META[key].label}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {THEME_TEMPLATE_META[key].description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          <p className="text-sm font-medium">Palette</p>
          <div className="mt-3 flex gap-3">
            {PALETTE_SWATCHES[template].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPalette(i)}
                aria-label={`Palette option ${i + 1}`}
                className={`relative h-11 w-11 overflow-hidden rounded-full border-2 transition-all duration-150 hover:scale-105 active:scale-95 ${
                  palette === i ? "border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: p.primary }}
              >
                {palette === i && (
                  <Check
                    className="absolute inset-0 m-auto h-4 w-4 animate-in zoom-in-50 duration-150"
                    style={{ color: p.accent }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="mt-8">
          {saving ? "Saving…" : "Publish theme"}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <ThemeScope tokens={preview} className="p-7 transition-colors duration-300">
          <p className="store-nav-link store-accent-text text-xs font-semibold">Preview</p>
          <h2 className="store-heading mt-2.5 text-2xl font-semibold">Akosua & Co.</h2>
          <p className="store-muted mt-2.5 max-w-xs text-sm leading-relaxed">
            Small-batch, handmade pieces — requested here, confirmed by us.
          </p>
          <div className="store-btn-primary mt-5 inline-block px-5 py-2.5 text-sm font-medium">
            Shop the collection
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="store-card p-3.5">
                <div className="store-surface aspect-square rounded-[var(--store-radius)]" />
                <p className="store-heading mt-2.5 text-sm">Sample product</p>
                <p className="store-accent-text text-xs">GH₵ 260</p>
              </div>
            ))}
          </div>
        </ThemeScope>
      </Card>
    </div>
  );
}
