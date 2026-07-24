import type { ThemeTemplate, ThemeTokens } from "./types";

export const THEME_PRESETS: Record<ThemeTemplate, ThemeTokens> = {
  FASHION: {
    template: "FASHION",
    primary: "#B8452F",
    secondary: "#1F1B16",
    accent: "#E8C468",
    background: "#FAF6F1",
    foreground: "#1F1B16",
    fontHeading: "var(--font-fraunces)",
    fontBody: "var(--font-inter)",
    radius: "0.5rem",
  },
  GENERAL: {
    template: "GENERAL",
    primary: "#2F5D50",
    secondary: "#1B2A27",
    accent: "#E0A458",
    background: "#F7F5F1",
    foreground: "#1B2A27",
    fontHeading: "var(--font-manrope)",
    fontBody: "var(--font-inter)",
    radius: "0.75rem",
  },
  CLEAN: {
    template: "CLEAN",
    primary: "#111111",
    secondary: "#4A4A4A",
    accent: "#C9A227",
    background: "#FFFFFF",
    foreground: "#111111",
    fontHeading: "var(--font-inter)",
    fontBody: "var(--font-inter)",
    radius: "0.125rem",
  },
};

export const THEME_TEMPLATE_META: Record<
  ThemeTemplate,
  { label: string; description: string }
> = {
  FASHION: {
    label: "Fashion",
    description: "Warm, editorial — serif headings and a textured palette.",
  },
  GENERAL: {
    label: "General Purpose",
    description: "Versatile and approachable, works for most storefronts.",
  },
  CLEAN: {
    label: "Clean / Minimal",
    description: "Porsche-minimal: black, white, one accent, sharp corners.",
  },
};

export const PALETTE_SWATCHES: Record<
  ThemeTemplate,
  { primary: string; accent: string }[]
> = {
  FASHION: [
    { primary: "#B8452F", accent: "#E8C468" },
    { primary: "#7A3B69", accent: "#E8C468" },
    { primary: "#1F5C4E", accent: "#D9B67F" },
  ],
  GENERAL: [
    { primary: "#2F5D50", accent: "#E0A458" },
    { primary: "#2C4A7C", accent: "#E0A458" },
    { primary: "#6B4226", accent: "#C9A66B" },
  ],
  CLEAN: [
    { primary: "#111111", accent: "#C9A227" },
    { primary: "#111111", accent: "#7A8C99" },
    { primary: "#111111", accent: "#B8452F" },
  ],
};
