"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Store, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/upload";
import { ACCEPTED_IMAGE_INPUT_ACCEPT, validateImageFile } from "@/lib/media-constraints";

export function LogoPicker({
  tenantId,
  logoUrl,
  onChange,
}: {
  tenantId: string;
  logoUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const error = validateImageFile(file);
    if (error) {
      toast.error(error, { description: file.name });
      return;
    }
    setUploading(true);
    try {
      const asset = await uploadMedia(tenantId, file);
      onChange(asset.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload logo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : logoUrl ? (
          <Image src={logoUrl} alt="Store logo" width={64} height={64} className="h-full w-full object-contain" />
        ) : (
          <Store className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          <UploadCloud className="h-3.5 w-3.5" />
          {logoUrl ? "Replace logo" : "Upload logo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {logoUrl && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={uploading}
            className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
