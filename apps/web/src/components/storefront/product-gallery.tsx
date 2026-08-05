"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return <div className="store-card aspect-square" />;
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="store-card relative aspect-square overflow-hidden">
        <Image
          src={images[selected]}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              aria-current={i === selected}
              className={`store-card relative aspect-square overflow-hidden transition-opacity ${
                i === selected ? "opacity-100 ring-2 ring-[var(--store-primary)]" : "opacity-80 hover:opacity-100"
              }`}
            >
              <Image src={img} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
