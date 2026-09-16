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
  BOLD: {
    template: "BOLD",
    primary: "#E8492C",
    secondary: "#8C5A45",
    accent: "#F2B705",
    background: "#FFF8F0",
    foreground: "#2B1810",
    fontHeading: "var(--font-manrope)",
    fontBody: "var(--font-inter)",
    radius: "1.25rem",
  },
  LUXE: {
    template: "LUXE",
    primary: "#241322",
    secondary: "#6B4E63",
    accent: "#D4AF37",
    background: "#FBF8F5",
    foreground: "#241322",
    fontHeading: "var(--font-cormorant)",
    fontBody: "var(--font-inter)",
    radius: "0.25rem",
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
  BOLD: {
    label: "Bold & Vibrant",
    description: "Punchy color, confident type, generous rounded corners.",
  },
  LUXE: {
    label: "Luxe",
    description: "Rich, jewel-toned and refined, with a gold edge for premium goods.",
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
    { primary: "#6B1F2E", accent: "#D9A566" },
    { primary: "#23324D", accent: "#B8935B" },
  ],
  GENERAL: [
    { primary: "#2F5D50", accent: "#E0A458" },
    { primary: "#2C4A7C", accent: "#E0A458" },
    { primary: "#6B4226", accent: "#C9A66B" },
    { primary: "#7A3B69", accent: "#E0A458" },
    { primary: "#1E5F5F", accent: "#D97B4F" },
  ],
  CLEAN: [
    { primary: "#111111", accent: "#C9A227" },
    { primary: "#111111", accent: "#7A8C99" },
    { primary: "#111111", accent: "#B8452F" },
    { primary: "#111111", accent: "#2F6F4E" },
    { primary: "#111111", accent: "#5C4A9C" },
  ],
  BOLD: [
    { primary: "#E8492C", accent: "#F2B705" },
    { primary: "#C21807", accent: "#F2B705" },
    { primary: "#1F5C99", accent: "#F2B705" },
    { primary: "#1F7A5C", accent: "#E8492C" },
  ],
  LUXE: [
    { primary: "#241322", accent: "#D4AF37" },
    { primary: "#1B2A4A", accent: "#9A9A9E" },
    { primary: "#3B1520", accent: "#D4AF37" },
    { primary: "#0F2E23", accent: "#C9A66B" },
  ],
};
