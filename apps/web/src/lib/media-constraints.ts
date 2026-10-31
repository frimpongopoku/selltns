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
// iPhone photos. The API can't decode them (sharp's prebuilt binaries leave
// out the HEVC codec), so they're converted to JPEG in the browser before
// upload — see prepareImageFile.
const HEIC_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];
const HEIC_EXTENSION = /\.(heic|heif)$/i;

export const ACCEPTED_IMAGE_INPUT_ACCEPT = [
  ...ACCEPTED_IMAGE_TYPES,
  "image/heic",
  "image/heif",
  ".heic",
  ".heif",
].join(",");

export function isHeicFile(file: File): boolean {
  // Some browsers report HEIC with an empty type, so fall back to the name.
  return HEIC_TYPES.includes(file.type) || HEIC_EXTENSION.test(file.name);
}

/**
 * Validates a picked image, converting an iPhone HEIC photo to JPEG first so
 * it can be previewed and uploaded like any other image.
 */
export async function prepareImageFile(
  file: File,
): Promise<{ file: File; error: null } | { file: null; error: string }> {
  let prepared = file;
  if (isHeicFile(file)) {
    try {
      const { heicTo } = await import("heic-to/next");
      const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
      prepared = new File([blob], file.name.replace(HEIC_EXTENSION, "") + ".jpg", {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    } catch {
      return { file: null, error: "Couldn't read that iPhone photo. Try another one." };
    }
  }
  const error = validateImageFile(prepared);
  return error ? { file: null, error } : { file: prepared, error: null };
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP, GIF or iPhone (HEIC) photos are supported.";
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
