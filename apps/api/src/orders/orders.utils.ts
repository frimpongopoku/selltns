import { randomBytes, randomInt } from 'node:crypto';

// Opaque, non-guessable — goes in the tracking URL. Old mock data used
// `trk_${Date.now()}`, which is sequential/guessable; this isn't.
export function generateTrackingToken(): string {
  return randomBytes(18).toString('base64url');
}

// Short, human-typeable code a customer reads off their screen and types
// into a Mobile Money/bank transfer note. Alphabet excludes visually
// ambiguous characters (0/O, 1/I/L) so it's easy to read and type correctly.
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generatePaymentReference(): string {
  const chars = Array.from(
    { length: 8 },
    () => REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)],
  );
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}
