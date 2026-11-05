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

type Swatch = { primary: string; accent: string };

const sameColor = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Which palette of `template` the saved theme uses — or -1 when the saved
// colors aren't one of the current options (e.g. a palette since changed),
// in which case they're offered as their own "current colors" swatch.
function savedPaletteIndex(current: ThemeTokens, template: ThemeTemplate): number {
  if (template !== current.template) return 0;
  return PALETTE_SWATCHES[template].findIndex(
    (p) => sameColor(p.primary, current.primary) && sameColor(p.accent, current.accent),
  );
}

export function ThemePicker({
  tenantId,
  tenantName,
  current,
}: {
  tenantId: string;
  tenantName: string;
  current: ThemeTokens;
}) {
  const router = useRouter();
  // Opens on what the storefront actually uses: the saved template *and*
  // its saved palette (it used to always reset to the first palette).
  const [template, setTemplate] = useState<ThemeTemplate>(current.template);
  const [palette, setPalette] = useState(() => savedPaletteIndex(current, current.template));
  const [saving, setSaving] = useState(false);

  const savedColors: Swatch = { primary: current.primary, accent: current.accent };
  // The saved colors get their own swatch only when they match no option.
  const showSavedSwatch = template === current.template && savedPaletteIndex(current, template) === -1;
  const swatches: { swatch: Swatch; index: number }[] = [
    ...(showSavedSwatch ? [{ swatch: savedColors, index: -1 }] : []),
    ...PALETTE_SWATCHES[template].map((p, i) => ({ swatch: p, index: i })),
  ];
  const swatch: Swatch = palette === -1 ? savedColors : PALETTE_SWATCHES[template][palette];
  const isCurrent =
    template === current.template &&
    sameColor(swatch.primary, current.primary) &&
    sameColor(swatch.accent, current.accent);
  const preview: ThemeTokens = {
    ...THEME_PRESETS[template],
    primary: swatch.primary,
    accent: swatch.accent,
  };

  async function handleSave() {
    setSaving(true);
    try {
      await updateTenantTheme(tenantId, preview);
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
                  setPalette(savedPaletteIndex(current, key));
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
          <div className="mt-3 flex flex-wrap gap-3">
            {swatches.map(({ swatch: p, index: i }) => (
              <button
                key={i}
                type="button"
                onClick={() => setPalette(i)}
                aria-label={i === -1 ? "Your current colors" : `Palette option ${i + 1}`}
                title={i === -1 ? "Your current colors" : undefined}
                className={`relative h-11 w-11 overflow-hidden rounded-full border-2 ring-1 ring-border transition-all duration-150 hover:scale-105 active:scale-95 ${
                  palette === i ? "border-foreground" : "border-transparent"
                }`}
                style={{
                  // Split into primary/accent halves — some presets (like
                  // Clean) reuse the same near-black primary across every
                  // palette option, so a solid-primary swatch would render
                  // as an invisible black circle on a dark background with
                  // no way to tell the options apart.
                  background: `linear-gradient(135deg, ${p.primary} 50%, ${p.accent} 50%)`,
                }}
              >
                {palette === i && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm animate-in zoom-in-50 duration-150">
                      <Check className="h-3 w-3 text-black" />
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || isCurrent}>
            {saving ? "Saving…" : "Publish theme"}
          </Button>
          {isCurrent && <span className="text-sm text-muted-foreground">This is your live theme.</span>}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <ThemeScope tokens={preview} className="p-7 transition-colors duration-300">
          <p className="store-nav-link store-accent-text text-xs font-semibold">Preview</p>
          <h2 className="store-heading mt-2.5 text-2xl font-semibold">{tenantName}</h2>
          <p className="store-muted mt-2.5 max-w-xs text-sm leading-relaxed">
            Small-batch, handmade pieces — requested here, confirmed by us.
          </p>
          <div className="store-btn-primary mt-5 inline-block px-5 py-2.5 text-sm font-medium">
            Shop Now
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
