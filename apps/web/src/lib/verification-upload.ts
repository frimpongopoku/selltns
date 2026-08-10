import type { VerificationStatusResult } from "./types";

// Multipart, same reasoning as lib/upload.ts's uploadMedia(): needs XHR for
// upload progress and must not set Content-Type manually. Posts through the
// existing /api/admin/[...path] proxy, which already forwards any method/
// path/body (including multipart) with the session's Bearer token attached.
export interface SubmitVerificationInput {
  legalName: string;
  ghanaCardNumber: string;
  idPhoto: File;
  selfiePhoto?: File | null;
}

export function submitVerification(
  input: SubmitVerificationInput,
  onProgress?: (fraction: number) => void,
): Promise<VerificationStatusResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("legalName", input.legalName);
    form.append("ghanaCardNumber", input.ghanaCardNumber);
    form.append("idPhoto", input.idPhoto);
    if (input.selfiePhoto) form.append("selfiePhoto", input.selfiePhoto);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/verification");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as VerificationStatusResult);
        return;
      }
      reject(new Error(parseErrorMessage(xhr.responseText, xhr.status)));
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
