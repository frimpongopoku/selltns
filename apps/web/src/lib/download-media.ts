import JSZip from "jszip";
import type { MediaAsset } from "./types";

// Same reasoning as the media proxy usage in generate-product-flyer.ts /
// generate-collection-flyer.ts: the R2 bucket these photos live in sends
// no CORS headers, so a direct cross-origin fetch() fails — route through
// our own same-origin proxy instead.
function mediaProxyUrl(url: string): string {
  return `/api/media-proxy?url=${encodeURIComponent(url)}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// A human-readable, collision-safe filename for one asset within a batch —
// `taken` accumulates across calls so two untitled photos (or two with the
// same title) don't clobber each other inside the zip. Always .jpg — every
// downloaded photo is converted to JPEG (see toJpegBlob) regardless of how
// it's actually stored (mostly WebP), since that's what opens everywhere
// without a fuss.
function filenameFor(asset: MediaAsset, taken: Set<string>): string {
  const base =
    (asset.title || asset.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "photo";
  let name = `${base}.jpg`;
  let n = 2;
  while (taken.has(name)) {
    name = `${base}-${n}.jpg`;
    n += 1;
  }
  taken.add(name);
  return name;
}

// Re-encodes any image blob as JPEG via canvas — plain Canvas2D, not a
// server-side re-encode: this codebase already burned itself once on
// sharp-based image re-encoding breaking storefronts in prod (see git
// history), so image processing here deliberately stays client-side, same
// as the flyer/label/QR generators. A JPEG source is passed through as-is
// (no point in a lossy re-encode); anything already-JPEG is the common
// case so this also skips needless work for it. Filled on white first —
// JPEG has no alpha channel, so a transparent source would otherwise pick
// up whatever the canvas defaults to.
async function toJpegBlob(blob: Blob): Promise<Blob> {
  if (blob.type === "image/jpeg") return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const jpegBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    return jpegBlob ?? blob;
  } catch {
    // Falls back to the original bytes — a photo downloaded in its native
    // format beats one that failed to download at all.
    return blob;
  }
}

// "<shop>-gallery-<timestamp>.zip", e.g. "akosua-co-gallery-2026-09-13-1432.zip"
// — so a vendor downloading their gallery more than once can tell the
// archives apart without opening them.
export function galleryZipFilename(shopName: string): string {
  const slug =
    shopName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "shop";
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${slug}-gallery-${stamp}.zip`;
}

async function fetchAssetBlob(asset: MediaAsset): Promise<Blob> {
  const res = await fetch(mediaProxyUrl(asset.url));
  if (!res.ok) throw new Error(`Couldn't fetch ${asset.title || "a photo"}.`);
  const blob = await res.blob();
  return toJpegBlob(blob);
}

// Runs `fn` over `items` with at most `limit` in flight at once — full
// parallelism can overwhelm the browser's per-host connection limit and a
// slow mobile network on a large selection; fully serial is needlessly slow.
async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export interface DownloadMediaResult {
  succeeded: number;
  failed: number;
}

// Downloads one photo directly; zips two or more into a single archive so
// the browser only ever shows one save prompt, no matter how many photos
// were selected. A photo that fails to fetch is skipped rather than
// aborting the whole batch — the caller reports the split via the result.
export async function downloadMediaAssets(
  assets: MediaAsset[],
  onProgress?: (done: number, total: number) => void,
  zipFilename = "photos.zip",
): Promise<DownloadMediaResult> {
  if (assets.length === 0) return { succeeded: 0, failed: 0 };

  if (assets.length === 1) {
    const asset = assets[0];
    try {
      const blob = await fetchAssetBlob(asset);
      onProgress?.(1, 1);
      triggerBlobDownload(blob, filenameFor(asset, new Set()));
      return { succeeded: 1, failed: 0 };
    } catch {
      onProgress?.(1, 1);
      return { succeeded: 0, failed: 1 };
    }
  }

  const zip = new JSZip();
  const taken = new Set<string>();
  let done = 0;
  let failed = 0;
  await mapWithConcurrency(assets, 4, async (asset) => {
    try {
      const blob = await fetchAssetBlob(asset);
      zip.file(filenameFor(asset, taken), blob);
    } catch {
      failed += 1;
    } finally {
      done += 1;
      onProgress?.(done, assets.length);
    }
  });

  const succeeded = assets.length - failed;
  if (succeeded > 0) {
    const zipBlob = await zip.generateAsync({ type: "blob" });
    triggerBlobDownload(zipBlob, zipFilename);
  }
  return { succeeded, failed };
}
