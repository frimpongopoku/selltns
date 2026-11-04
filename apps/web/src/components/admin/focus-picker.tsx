"use client";

import Image from "next/image";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOCUS_PRESETS, positionOf, type Focus } from "@/lib/image-focus";
import { cn } from "@/lib/utils";

// Shows the whole photo (never cropped) and lets the vendor tap where the
// product is. That point decides which part of the photo shows inside the
// shop's cropped frames.
export function FocusPicker({
  src,
  width,
  height,
  alt,
  value,
  onChange,
  className,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  value: Focus | null;
  onChange: (focus: Focus | null) => void;
  className?: string;
}) {
  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));
    onChange({
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    });
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex w-full justify-center rounded-lg border bg-muted p-2">
        <div
          role="button"
          tabIndex={-1}
          aria-label="Tap where the product is"
          onPointerDown={handlePointer}
          className="relative cursor-crosshair touch-none select-none"
        >
          <Image
            src={src}
            alt={alt}
            width={width || 800}
            height={height || 1000}
            sizes="400px"
            draggable={false}
            className="block h-auto max-h-[42vh] w-auto max-w-full rounded"
          />
          {value && (
            <span
              className="pointer-events-none absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/40 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
              style={{ left: `${value.x}%`, top: `${value.y}%` }}
            >
              <span className="size-1.5 rounded-full bg-white" />
            </span>
          )}
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Crosshair className="size-3.5" />
        Tap the photo where the product is. The photo itself is never cut.
      </p>
    </div>
  );
}

export function FocusPresets({
  value,
  onChange,
}: {
  value: Focus | null;
  onChange: (focus: Focus | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FOCUS_PRESETS.map(({ label, focus }) => (
        <Button
          key={label}
          type="button"
          size="sm"
          variant={value?.x === focus.x && value?.y === focus.y ? "default" : "outline"}
          onClick={() => onChange(focus)}
        >
          {label}
        </Button>
      ))}
      <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} disabled={value === null}>
        Reset
      </Button>
    </div>
  );
}

// How the photo will look in the shop's product card (4:5) and in square
// thumbnails, with the chosen focus.
export function FocusPreview({ src, focus }: { src: string; focus: Focus | null }) {
  const position = positionOf(focus);
  return (
    <div className="flex items-end gap-3">
      <figure className="w-24">
        <div className="relative aspect-[4/5] overflow-hidden rounded-md border">
          <Image src={src} alt="" fill sizes="96px" className="object-cover" style={{ objectPosition: position }} />
        </div>
        <figcaption className="mt-1 text-center text-[11px] text-muted-foreground">Shop card</figcaption>
      </figure>
      <figure className="w-20">
        <div className="relative aspect-square overflow-hidden rounded-md border">
          <Image src={src} alt="" fill sizes="80px" className="object-cover" style={{ objectPosition: position }} />
        </div>
        <figcaption className="mt-1 text-center text-[11px] text-muted-foreground">Thumbnail</figcaption>
      </figure>
    </div>
  );
}
