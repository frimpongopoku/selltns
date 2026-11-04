import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

// A gallery photo's optional focus point, as % from the left/top. Products
// keep a copy per image URL (Product.imageFocus) as a ready-made CSS
// object-position, so storefront reads need no extra lookup.
export interface Focus {
  x: number;
  y: number;
}

export function parseFocus(raw: unknown): Focus | null {
  if (raw === null) return null;
  const f = (raw ?? {}) as Record<string, unknown>;
  const valid = (v: unknown): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100;
  const { x, y } = f;
  if (!valid(x) || !valid(y)) {
    throw new BadRequestException(
      'focus must be null or { x, y } whole numbers from 0 to 100.',
    );
  }
  return { x, y };
}

export async function imageFocusFor(
  prisma: PrismaService,
  tenantId: string,
  images: string[],
): Promise<Record<string, string>> {
  if (images.length === 0) return {};
  const assets = await prisma.mediaAsset.findMany({
    where: {
      tenantId,
      url: { in: images },
      focusX: { not: null },
      focusY: { not: null },
    },
    select: { url: true, focusX: true, focusY: true },
  });
  return Object.fromEntries(
    assets.map((a) => [a.url, `${a.focusX}% ${a.focusY}%`]),
  );
}

// Re-copies focus onto every product showing any of these images — called
// after a gallery photo's focus changes.
export async function syncProductImageFocus(
  prisma: PrismaService,
  tenantId: string,
  urls: string[],
): Promise<void> {
  if (urls.length === 0) return;
  const products = await prisma.product.findMany({
    where: { tenantId, images: { hasSome: urls } },
    select: { id: true, images: true },
  });
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        imageFocus: await imageFocusFor(prisma, tenantId, product.images),
      },
    });
  }
}
