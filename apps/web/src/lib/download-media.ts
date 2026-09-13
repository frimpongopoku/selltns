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
// same title) don't clobber each other inside the zip.
function filenameFor(asset: MediaAsset, taken: Set<string>): string {
  const extMatch = asset.url.match(/\.[a-zA-Z0-9]+(?:\?|$)/);
  const ext = extMatch ? extMatch[0].replace(/\?.*$/, "") : ".jpg";
  const base =
    (asset.title || asset.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "photo";
  let name = `${base}${ext}`;
  let n = 2;
  while (taken.has(name)) {
    name = `${base}-${n}${ext}`;
    n += 1;
  }
  taken.add(name);
  return name;
}

async function fetchAssetBlob(asset: MediaAsset): Promise<Blob> {
  const res = await fetch(mediaProxyUrl(asset.url));
  if (!res.ok) throw new Error(`Couldn't fetch ${asset.title || "a photo"}.`);
  return res.blob();
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
    triggerBlobDownload(zipBlob, "photos.zip");
  }
  return { succeeded, failed };
}
