import type { Metadata } from "next";
import { getProductSheet } from "@/lib/api";
import { ProductSheetApp } from "@/components/product-sheet/product-sheet-app";
import { ShopThemeBody } from "@/components/photo-drop/shop-theme-body";
import { ThemeScope } from "@/components/theme/theme-scope";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const sheet = await getProductSheet(token).catch(() => null);
  const title = sheet ? `${sheet.shop.name} · Product sheet` : "Product sheet";
  const description = sheet
    ? `Update ${sheet.shop.name}'s products and add new ones.`
    : "Ask the shop for their current product sheet link.";
  const images = sheet?.shop.logoUrl ? [{ url: sheet.shop.logoUrl }] : undefined;
  return {
    title,
    description,
    // Shop-branded preview when the link is sent on iMessage or WhatsApp.
    openGraph: { title, description, images, siteName: sheet?.shop.name },
    twitter: { card: "summary", title, description, images: sheet?.shop.logoUrl ? [sheet.shop.logoUrl] : undefined },
    // A private team link — never indexed, never followed.
    robots: { index: false, follow: false },
  };
}

export default async function ProductSheetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sheet = await getProductSheet(token).catch(() => null);
  if (!sheet) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-lg font-semibold">This link isn&apos;t active</p>
        <p className="max-w-xs text-sm text-muted-foreground">Ask the shop for their current product sheet link.</p>
      </main>
    );
  }
  return (
    <ThemeScope tokens={sheet.shop.themeTokens} className="store-ui">
      <ShopThemeBody tokens={sheet.shop.themeTokens} />
      <ProductSheetApp token={token} initial={sheet} />
    </ThemeScope>
  );
}
