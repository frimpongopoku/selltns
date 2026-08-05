import type { MediaAsset } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

// Plain fetch has no upload-progress event, so a real progress bar needs
// XHR. Kept separate from lib/api.ts's JSON `request()` helper since this is
// multipart and must NOT set a Content-Type header — the browser fills in
// the multipart boundary itself.
export interface UploadMediaOptions {
  title?: string;
  tags?: string[];
}

export function uploadMedia(
  tenantId: string,
  file: File,
  options: UploadMediaOptions = {},
  onProgress?: (fraction: number) => void,
): Promise<MediaAsset> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("tenantId", tenantId);
    if (options.title) form.append("title", options.title);
    if (options.tags?.length) form.append("tags", JSON.stringify(options.tags));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/media`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as MediaAsset);
        return;
      }
      const message = parseErrorMessage(xhr.responseText, xhr.status);
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection."));

    xhr.send(form);
  });
}

function parseErrorMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(" ");
    if (parsed.message) return parsed.message;
  } catch {
    // not JSON — fall through
  }
  return `Upload failed (${status})`;
}
