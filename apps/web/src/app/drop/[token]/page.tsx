import type { Metadata } from "next";
import { getPhotoDrop } from "@/lib/api";
import { PhotoDropApp } from "@/components/photo-drop/photo-drop-app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const drop = await getPhotoDrop(token).catch(() => null);
  return {
    title: drop ? `${drop.shop.name} · Photo drop` : "Photo drop",
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
  return <PhotoDropApp token={token} initial={drop} />;
}
