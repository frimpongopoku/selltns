// Sanity bounds on what an owner can set as a relationship's markup cap —
// not a business rule the user specified, just guards against fat-fingering
// (e.g. a percentage cap of 10000).
// Pesewas: GHS 1 to GHS 1,000,000.
export const MIN_FIXED_CAP = 100;
export const MAX_FIXED_CAP = 100_000_000;
export const MIN_PERCENTAGE_CAP = 1;
export const MAX_PERCENTAGE_CAP = 500;
