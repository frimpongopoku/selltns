"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/upload";
import {
  ACCEPTED_IMAGE_INPUT_ACCEPT,
  formatBytes,
  MAX_UPLOAD_BYTES,
  validateImageFile,
} from "@/lib/media-constraints";
import type { MediaAsset } from "@/lib/types";

interface PendingUpload {
  key: string;
  name: string;
  progress: number;
}

export function MediaDropzone({
  tenantId,
  onUploaded,
  compact = false,
}: {
  tenantId: string;
  onUploaded: (asset: MediaAsset) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);

      for (const file of files) {
        const error = validateImageFile(file);
        if (error) {
          toast.error(error, { description: file.name });
          continue;
        }

        const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
        setPending((prev) => [...prev, { key, name: file.name, progress: 0 }]);

        uploadMedia(tenantId, file, (fraction) => {
          setPending((prev) =>
            prev.map((p) => (p.key === key ? { ...p, progress: fraction } : p)),
          );
        })
          .then((asset) => {
            onUploaded(asset);
          })
          .catch((err: Error) => {
            toast.error("Upload failed", { description: err.message });
          })
          .finally(() => {
            setPending((prev) => prev.filter((p) => p.key !== key));
          });
      }
    },
    [tenantId, onUploaded],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-center transition-colors ${
          compact ? "p-4" : "p-8"
        } ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/40"
        }`}
      >
        <UploadCloud className={compact ? "h-5 w-5 text-muted-foreground" : "h-6 w-6 text-muted-foreground"} />
        <p className="text-sm font-medium">
          Drop photos here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP or GIF — up to {formatBytes(MAX_UPLOAD_BYTES)} each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {pending.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {pending.map((p) => (
            <div key={p.key} className="flex items-center gap-2.5 text-xs">
              <span className="w-28 shrink-0 truncate text-muted-foreground">{p.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150"
                  style={{ width: `${Math.round(p.progress * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
