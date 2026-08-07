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
