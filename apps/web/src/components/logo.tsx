import Image from "next/image";

// Renders /public/logo-mark.png (generated from the same gradient+"S"
// design this used to render as an inline <svg><text>S</text></svg>) rather
// than live SVG text. That inline text node sat directly next to the
// adjacent "Selltns" wordmark almost everywhere this component is used —
// aria-hidden stops assistive tech from reading it, but does nothing for
// naive text-scraping crawlers, which read raw DOM text in document order
// and concatenated it into "SSelltns". That's a real, external-facing
// problem (confirmed via Google's OAuth homepage-verification checker
// flagging the app name as not matching), not just a cosmetic one — a
// raster image has no text content at all, so it can't happen regardless
// of what tool is reading the page. alt="" is deliberate: the adjacent
// visible wordmark already states the name, so a non-empty alt would just
// reintroduce the same duplication via a different mechanism.
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-mark.png"
      width={size}
      height={size}
      alt=""
      className={className}
    />
  );
}
