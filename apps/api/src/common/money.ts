// All money is stored and passed around in pesewas (GHS 4.99 = 499) —
// whole numbers, so sums and percentages never pick up float errors.

// "GH₵4.99", or "GH₵5" when there are no pesewas.
export function formatGHS(pesewas: number): string {
  const digits = pesewas % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(pesewas / 100);
}

// "GHS 4.99" — for plain-text notes and error messages.
export function ghs(pesewas: number): string {
  const cedis = pesewas / 100;
  return `GHS ${pesewas % 100 === 0 ? cedis : cedis.toFixed(2)}`;
}
