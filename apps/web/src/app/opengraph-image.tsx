import { ImageResponse } from "next/og";
import {
  MarketingOgImage,
  marketingOgImageAlt,
  marketingOgImageSize,
} from "@/lib/marketing-og-image";

export const alt = marketingOgImageAlt;
export const size = marketingOgImageSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<MarketingOgImage />, { ...size });
}
