"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Store, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/upload";
import { ACCEPTED_IMAGE_INPUT_ACCEPT, validateImageFile } from "@/lib/media-constraints";

interface StagedLogo {
  file: File;
  previewUrl: string;
}

export function LogoPicker({
  tenantId,
  logoUrl,
  saving = false,
  onChange,
}: {
  tenantId: string;
  logoUrl: string | null;
  saving?: boolean;
  onChange: (url: string | null) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<StagedLogo | null>(null);
  const [uploading, setUploading] = useState(false);
  const busy = uploading || saving;

  // Revoke the staged preview blob on unmount so it doesn't leak.
  useEffect(() => {
    return () => {
      if (staged) URL.revokeObjectURL(staged.previewUrl);
    };
  }, [staged]);

  function handleSelect(file: File) {
    const error = validateImageFile(file);
    if (error) {
      toast.error(error, { description: file.name });
      return;
    }
    setStaged({ file, previewUrl: URL.createObjectURL(file) });
  }

  function cancelStaged() {
    if (staged) URL.revokeObjectURL(staged.previewUrl);
    setStaged(null);
  }

  async function confirmUpload() {
    if (!staged) return;
    setUploading(true);
    try {
      const asset = await uploadMedia(tenantId, staged.file);
      await onChange(asset.url);
      URL.revokeObjectURL(staged.previewUrl);
      setStaged(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload logo.");
    } finally {
      setUploading(false);
    }
  }

  const previewSrc = staged?.previewUrl ?? logoUrl;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : previewSrc ? (
            <Image
              src={previewSrc}
              alt="Store logo"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              unoptimized={!!staged}
            />
          ) : (
            <Store className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          {staged ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={confirmUpload}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Use this photo"}
              </button>
              <button
                type="button"
                onClick={cancelStaged}
                disabled={busy}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex w-fit items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {logoUrl ? "Replace logo" : "Upload logo"}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSelect(file);
              e.target.value = "";
            }}
          />
          {!staged && logoUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          )}
        </div>
      </div>
      {staged && (
        <p className="text-xs text-muted-foreground">
          Preview only — click &quot;Use this photo&quot; to upload and save it.
        </p>
      )}
    </div>
  );
}
