// Mirrors apps/api/src/media/media.constants.ts — kept in sync by hand since
// the two apps don't share a package. This copy is for instant client-side
// feedback only; the API re-validates on upload regardless.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const ACCEPTED_IMAGE_INPUT_ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP or GIF images are supported.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That photo is too large — keep uploads under ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}
