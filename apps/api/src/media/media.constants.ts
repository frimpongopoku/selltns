// Upload accepted at this size or smaller — generous enough for a phone photo
// straight out of the camera, small enough to keep processing fast.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

// Longest edge, in pixels, for the two derived sizes. 2048 comfortably covers
// full-bleed hero/detail use without shipping camera-original megapixels;
// 480 is enough for grid tiles and pickers at typical device pixel ratios.
export const DISPLAY_MAX_DIMENSION = 2048;
export const THUMB_MAX_DIMENSION = 480;

// WebP quality — 82 is visually lossless for photography, 70 is fine for a
// small thumbnail where compression artifacts aren't visible at that size.
export const DISPLAY_QUALITY = 82;
export const THUMB_QUALITY = 70;
