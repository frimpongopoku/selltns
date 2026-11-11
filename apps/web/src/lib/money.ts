// Price inputs. Money from and to the API is in pesewas (GHS 4.99 = 499);
// people type cedis with up to two decimal places.

// "5", "4.99", ".5" and "10." are all fine; more than 2 decimals is not.
const PRICE_PATTERN = /^(\d+\.?\d{0,2}|\.\d{1,2})$/;

/** "4.99" → 499, "5" → 500; null when it isn't a valid amount. */
export function toPesewas(input: string): number | null {
  const s = input.trim().replace(/,/g, "");
  if (!PRICE_PATTERN.test(s)) return null;
  const [whole, fraction = ""] = s.split(".");
  return Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
}

/** 499 → "4.99", 500 → "5", null → "" — for filling in a price box. */
export function priceInput(pesewas: number | null | undefined): string {
  if (pesewas == null) return "";
  const cedis = Math.floor(pesewas / 100);
  const rest = pesewas % 100;
  return rest === 0 ? String(cedis) : `${cedis}.${String(rest).padStart(2, "0")}`;
}

export const isPrice = (input: string) => toPesewas(input) !== null;

/** Cedis as a plain number (4.99), e.g. for schema.org prices. */
export const toCedis = (pesewas: number) => pesewas / 100;
