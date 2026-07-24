"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createMedia, deleteMedia } from "@/lib/api";
import type { MediaAsset } from "@/lib/types";

const STOCK_PHOTOS = [
  "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200",
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200",
];

export function GalleryGrid({ assets }: { assets: MediaAsset[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleUpload() {
    const url = STOCK_PHOTOS[Math.floor(Math.random() * STOCK_PHOTOS.length)];
    startTransition(async () => {
      await createMedia({ url, thumbUrl: url, altText: "Uploaded photo" });
      toast.success("Photo added to gallery");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMedia(id);
      router.refresh();
    });
  }

  return (
    <div>
      <Button onClick={handleUpload} disabled={isPending} className="gap-1.5">
        <Upload className="h-4 w-4" />
        {isPending ? "Uploading…" : "Upload photo"}
      </Button>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Mock upload — adds a random stock photo. Real uploads land here too,
        this is the single picker used everywhere in the admin.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {assets.map((asset) => (
          <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-lg border">
            <Image src={asset.thumbUrl} alt={asset.altText} fill sizes="200px" className="object-cover" />
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
    </div>
  );
}
