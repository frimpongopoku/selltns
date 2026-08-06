"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, RotateCcw, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/admin/tag-input";
import { uploadMedia } from "@/lib/upload";
import {
  ACCEPTED_IMAGE_INPUT_ACCEPT,
  formatBytes,
  MAX_UPLOAD_BYTES,
  validateImageFile,
} from "@/lib/media-constraints";
import type { MediaAsset } from "@/lib/types";

interface StagedFile {
  key: string;
  file: File;
  previewUrl: string;
  title: string;
  tags: string[];
  status: "idle" | "uploading" | "error";
  progress: number;
  error?: string;
}

const UPLOAD_CONCURRENCY = 3;

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
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Revoke every remaining preview URL on unmount so blobs don't leak.
  useEffect(() => {
    return () => {
      setStaged((prev) => {
        prev.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        return prev;
      });
    };
  }, []);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const additions: StagedFile[] = [];
    for (const file of Array.from(fileList)) {
      const error = validateImageFile(file);
      if (error) {
        toast.error(error, { description: file.name });
        continue;
      }
      additions.push({
        key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        title: "",
        tags: [],
        status: "idle",
        progress: 0,
      });
    }
    if (additions.length > 0) setStaged((prev) => [...prev, ...additions]);
  }, []);

  function removeStaged(key: string) {
    setStaged((prev) => {
      const target = prev.find((s) => s.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.key !== key);
    });
  }

  function cancelAll() {
    staged.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setStaged([]);
  }

  function patchStaged(key: string, patch: Partial<StagedFile>) {
    setStaged((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  async function confirmUpload() {
    const queue = staged.filter((s) => s.status !== "uploading");
    if (queue.length === 0) return;
    setSubmitting(true);

    let cursor = 0;
    async function worker() {
      while (cursor < queue.length) {
        const item = queue[cursor];
        cursor += 1;
        patchStaged(item.key, { status: "uploading", progress: 0, error: undefined });
        try {
          const asset = await uploadMedia(
            tenantId,
            item.file,
            { title: item.title || undefined, tags: item.tags },
            (fraction) => patchStaged(item.key, { progress: fraction }),
          );
          onUploaded(asset);
          URL.revokeObjectURL(item.previewUrl);
          setStaged((prev) => prev.filter((s) => s.key !== item.key));
        } catch (err) {
          patchStaged(item.key, { status: "error", error: (err as Error).message });
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, worker));
    setSubmitting(false);
  }

  const uploadableCount = staged.filter((s) => s.status !== "uploading").length;

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
        <p className="text-sm font-medium">Drop photos here, or click to browse</p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP or GIF — up to {formatBytes(MAX_UPLOAD_BYTES)}
          {" "}each. You&apos;ll get a chance to review before anything uploads.
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

      {staged.length > 0 && (
        <div className="mt-4">
          <div
            className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}
          >
            {staged.map((item) => (
              <div key={item.key} className="flex gap-3 rounded-lg border p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image src={item.previewUrl} alt="" fill sizes="64px" className="object-cover" unoptimized />
                  {item.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-[10px] font-medium text-white">
                        {Math.round(item.progress * 100)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground" title={item.file.name}>
                      {item.file.name} · {formatBytes(item.file.size)}
                    </p>
                    {item.status !== "uploading" && (
                      <button
                        type="button"
                        onClick={() => removeStaged(item.key)}
                        aria-label="Remove from upload"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Input
                    value={item.title}
                    onChange={(e) => patchStaged(item.key, { title: e.target.value })}
                    placeholder="Name this photo (optional)"
                    disabled={item.status === "uploading"}
                    className="h-8 text-sm"
                  />
                  <TagInput
                    tags={item.tags}
                    onChange={(tags) => patchStaged(item.key, { tags })}
                    placeholder="Add tags…"
                  />
                  {item.status === "error" && (
                    <div className="flex items-center justify-between gap-2 text-xs text-destructive">
                      <span>{item.error}</span>
                      <button
                        type="button"
                        onClick={() => patchStaged(item.key, { status: "idle", error: undefined })}
                        className="inline-flex items-center gap-1 font-medium hover:underline"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={cancelAll} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmUpload} disabled={submitting || uploadableCount === 0}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Upload {uploadableCount} photo{uploadableCount === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
