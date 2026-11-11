import type { AffiliateCapType } from "./types";

// The agreed markup ceiling on an affiliate relationship, phrased the same
// way everywhere it's shown (invite form, relationship list, affiliate
// products page) — e.g. "up to GHS 50 extra" or "up to 20% extra".
export function capLabel(capType: AffiliateCapType, capValue: number) {
  return capType === "FIXED" ? `up to ${formatMoney(capValue)} extra` : `up to ${capValue}% extra`;
}

// All money from the API is in pesewas (GHS 4.99 = 499). Shows "GH₵4.99",
// or "GH₵5" when there are no pesewas. See lib/money.ts for price inputs.
export function formatMoney(pesewas: number) {
  const digits = pesewas % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(pesewas / 100);
}

// jsPDF's built-in fonts only support WinAnsi encoding, which has no glyph
// for the Ghana Cedi sign (₵) — it renders as garbled characters. The PDF
// booklet uses this ASCII-safe variant instead of formatMoney().
export function formatMoneyAscii(pesewas: number) {
  const digits = pesewas % 100 === 0 ? 0 : 2;
  return `GHS ${new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(pesewas / 100)}`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
