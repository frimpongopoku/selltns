"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import {
  getVideoEmbedUrl,
  getYouTubeThumbnailUrl,
  isVerticalVideo,
} from "@/lib/video";

type MediaItem = { type: "image"; url: string } | { type: "video"; url: string };

export function ProductGallery({
  images,
  videoUrls = [],
  alt,
}: {
  images: string[];
  videoUrls?: string[];
  alt: string;
}) {
  const media: MediaItem[] = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...videoUrls.map((url) => ({ type: "video" as const, url })),
  ];
  const [selected, setSelected] = useState(0);

  if (media.length === 0) {
    return <div className="store-card aspect-square" />;
  }

  const current = media[selected];

  return (
    <div className="grid grid-cols-1 gap-3">
      {current.type === "image" ? (
        <div className="store-card relative aspect-square overflow-hidden bg-[var(--store-hover-bg)]">
          <Image
            src={current.url}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain"
            priority
          />
        </div>
      ) : (
        <VideoPlayer url={current.url} />
      )}

      {media.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {media.map((item, i) => (
            <button
              key={item.url}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={item.type === "image" ? `Show photo ${i + 1} of ${images.length}` : "Play video"}
              aria-current={i === selected}
              className={`store-card relative aspect-square overflow-hidden transition-opacity ${
                i === selected ? "opacity-100 ring-2 ring-[var(--store-primary)]" : "opacity-80 hover:opacity-100"
              }`}
            >
              {item.type === "image" ? (
                <Image src={item.url} alt="" fill sizes="120px" className="object-cover object-top" />
              ) : (
                <VideoThumb url={item.url} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoThumb({ url }: { url: string }) {
  const thumb = getYouTubeThumbnailUrl(url);
  return (
    <div className="relative h-full w-full bg-black">
      {thumb && <Image src={thumb} alt="" fill sizes="120px" className="object-cover opacity-80" />}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
          <Play className="h-3 w-3 translate-x-[1px] fill-black text-black" />
        </span>
      </div>
    </div>
  );
}

function VideoPlayer({ url }: { url: string }) {
  const embedUrl = getVideoEmbedUrl(url);
  if (!embedUrl) {
    return <div className="store-card aspect-square" />;
  }
  const vertical = isVerticalVideo(url);

  return (
    <div
      className={`store-card mx-auto w-full overflow-hidden bg-black animate-in fade-in-0 duration-300 ${
        vertical ? "aspect-[9/16] max-h-[70vh] max-w-[380px]" : "aspect-video"
      }`}
    >
      <iframe
        key={embedUrl}
        src={embedUrl}
        title="Product video"
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
