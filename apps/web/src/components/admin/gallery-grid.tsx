"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { MediaDropzone } from "@/components/admin/media-dropzone";
import { deleteMedia } from "@/lib/api";
import { formatBytes } from "@/lib/media-constraints";
import type { MediaAsset } from "@/lib/types";

export function GalleryGrid({
  tenantId,
  assets,
}: {
  tenantId: string;
  assets: MediaAsset[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMedia(id, tenantId);
      router.refresh();
    });
  }

  return (
    <div>
      <MediaDropzone tenantId={tenantId} onUploaded={() => router.refresh()} />

      {assets.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">No photos yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upload your first photo — it&apos;ll be available to pick from
            everywhere in the admin, including products and collections.
          </p>
        </div>
      ) : (
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {assets.map((asset) => (
          <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-lg border">
            <Image src={asset.thumbUrl} alt={asset.altText} fill sizes="200px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 translate-y-full bg-black/60 px-2 py-1 text-[10px] text-white transition-transform group-hover:translate-y-0">
              {asset.width}×{asset.height} · {formatBytes(asset.bytes)}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(asset.id)}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Delete photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
