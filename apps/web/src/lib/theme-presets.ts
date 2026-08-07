import type { ThemeTemplate, ThemeTokens } from "./types";

export const THEME_PRESETS: Record<ThemeTemplate, ThemeTokens> = {
  FASHION: {
    template: "FASHION",
    primary: "#17140F",
    secondary: "#5C5449",
    accent: "#C08A4E",
    background: "#FBFAF7",
    foreground: "#17140F",
    fontHeading: "var(--font-cormorant)",
    fontBody: "var(--font-inter)",
    radius: "0.5rem",
  },
  GENERAL: {
    template: "GENERAL",
    primary: "#2F5D50",
    secondary: "#1B2A27",
    accent: "#E0A458",
    background: "#F1F3ED",
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
    background: "#FAFAFA",
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
    description: "Warm, editorial. Serif headings and a textured palette.",
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
    { primary: "#17140F", accent: "#C08A4E" },
    { primary: "#5C3A54", accent: "#C9A66B" },
    { primary: "#1F5C4E", accent: "#8FA998" },
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
