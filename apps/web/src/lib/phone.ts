// Normalizes a Ghanaian phone number to the digits-only international
// format wa.me links require (e.g. "024 555 0134" -> "233245550134").
export function toWhatsAppNumber(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return `233${digits.slice(1)}`;
  return digits;
}

export function waLink(number: string, text?: string): string {
  const base = `https://wa.me/${toWhatsAppNumber(number)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// Reversible obfuscation for phone numbers that pass through a Server
// Component into a Client Component. Next.js serializes client component
// props straight into the page's initial HTML/RSC payload, so a raw number
// passed as a prop is still visible to any bot that just fetches the page
// source without running JS — "use client" alone does not hide it.
// obscurePhone() runs on the server before the value is handed to a client
// component; revealPhone() runs client-side (after mount) to decode it, so
// static-HTML scrapers only ever see the encoded token.
const SHIFT = 5;

export function obscurePhone(value: string): string {
  const shifted = Array.from(value)
    .map((ch) => String.fromCharCode(ch.charCodeAt(0) + SHIFT))
    .join("");
  return btoa(shifted).split("").reverse().join("");
}

export function revealPhone(encoded: string): string {
  const shifted = atob(encoded.split("").reverse().join(""));
  return Array.from(shifted)
    .map((ch) => String.fromCharCode(ch.charCodeAt(0) - SHIFT))
    .join("");
}

// Must be called on a PaymentMethod BEFORE it's passed as a prop into
// <PaymentMethodCard>. Obscuring only inside that (client) component's
// render isn't enough — Next.js still serializes the whole prop object,
// raw phone number included, into the page's RSC payload regardless of
// what the render output looks like.
export function obscurePaymentMethodPhone<
  T extends { type: "MOMO" | "BANK"; details: Record<string, string> },
>(method: T): T {
  if (method.type !== "MOMO" || !method.details.number) return method;
  return {
    ...method,
    details: { ...method.details, number: obscurePhone(method.details.number) },
  };
}
