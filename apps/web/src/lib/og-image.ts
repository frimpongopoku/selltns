import sharp from "sharp";

// Satori (what next/og's ImageResponse renders through) can't reliably
// decode WebP — it either throws "Image size cannot be determined" or,
// worse, silently renders a blank tile, and our own upload pipeline
// (apps/api's ImageProcessingService) always outputs WebP. So anything we
// composite into a generated OG image gets fetched and re-encoded to JPEG
// here first, sized down to the exact slot it'll render at — both to stay
// well under ImageResponse's 500KB total-bundle limit, and because Satori
// needs a format it can actually decode regardless of size.
export async function toEmbeddableImage(
  url: string,
  width: number,
  height: number,
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const jpeg = await sharp(buffer)
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}
