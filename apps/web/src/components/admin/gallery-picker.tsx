"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getGallery } from "@/lib/api";
import type { MediaAsset } from "@/lib/types";

export function GalleryPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (urls: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);

  useEffect(() => {
    if (open) getGallery().then(setAssets);
  }, [open]);

  function toggle(url: string) {
    onChange(selected.includes(url) ? selected.filter((u) => u !== url) : [...selected, url]);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {selected.map((url, i) => (
          <div key={`${url}-${i}`} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
            <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            <button
              type="button"
              onClick={() => toggle(url)}
              aria-label="Remove image"
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ))}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={<Button type="button" variant="outline" className="h-20 w-20 flex-col gap-1 text-xs" />}
          >
            <Plus className="h-4 w-4" />
            Add
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Choose from gallery</DialogTitle>
            </DialogHeader>
            <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
              {assets.map((asset) => {
                const isSelected = selected.includes(asset.url);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggle(asset.url)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all duration-150 hover:opacity-90 active:scale-95 ${
                      isSelected ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <Image src={asset.thumbUrl} alt={asset.altText} fill sizes="150px" className="object-cover" />
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 animate-in zoom-in-50 rounded-full bg-primary p-1 text-primary-foreground duration-150">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
