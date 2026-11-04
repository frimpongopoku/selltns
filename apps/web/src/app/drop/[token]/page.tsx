import type { Metadata } from "next";
import { getPhotoDrop } from "@/lib/api";
import { PhotoDropApp } from "@/components/photo-drop/photo-drop-app";
import { ShopThemeBody } from "@/components/photo-drop/shop-theme-body";
import { ThemeScope } from "@/components/theme/theme-scope";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const drop = await getPhotoDrop(token).catch(() => null);
  const title = drop ? `${drop.shop.name} · Photo drop` : "Photo drop";
  const description = drop
    ? `Add product photos for ${drop.shop.name}.`
    : "Ask the shop for their current photo drop link.";
  const images = drop?.shop.logoUrl ? [{ url: drop.shop.logoUrl }] : undefined;
  return {
    title,
    description,
    // Shop-branded preview when the link is sent on iMessage or WhatsApp.
    openGraph: { title, description, images, siteName: drop?.shop.name },
    twitter: { card: "summary", title, description, images: drop?.shop.logoUrl ? [drop.shop.logoUrl] : undefined },
    // A private team link — never indexed, never followed.
    robots: { index: false, follow: false },
  };
}

export default async function PhotoDropPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const drop = await getPhotoDrop(token).catch(() => null);
  if (!drop) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-lg font-semibold">This link isn&apos;t active</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Ask the shop for their current photo drop link.
        </p>
      </main>
    );
  }
  return (
    <ThemeScope tokens={drop.shop.themeTokens} className="store-ui">
      <ShopThemeBody tokens={drop.shop.themeTokens} />
      <PhotoDropApp token={token} initial={drop} />
    </ThemeScope>
  );
}
