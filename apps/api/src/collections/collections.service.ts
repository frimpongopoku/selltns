import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';
import type { Collection, ThemeTokens } from '../common/types';
import { Prisma } from '@prisma/client';
import type { Product as PrismaProduct } from '@prisma/client';

const PRODUCTS_INCLUDE = {
  products: {
    orderBy: { position: 'asc' as const },
    include: { product: true },
  },
} satisfies Prisma.CollectionInclude;

interface CollectionRow {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  seoTitle: string;
  seoDescription: string;
  themeOverride: Prisma.JsonValue | null;
  products: { productId: string; product: PrismaProduct }[];
}

function mapCollection(row: CollectionRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverImage: row.coverImage,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    themeOverride: row.themeOverride as ThemeTokens | null,
    productIds: row.products.map((cp) => cp.productId),
    products: row.products.map((cp) => cp.product),
  };
}

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { tenantId },
      include: PRODUCTS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return collections.map(mapCollection);
  }

  async findOne(idOrSlug: string, tenantId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { tenantId, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: PRODUCTS_INCLUDE,
    });
    if (!collection)
      throw new NotFoundException(`Collection ${idOrSlug} not found`);
    return mapCollection(collection);
  }

  async create(input: Partial<Collection> & { tenantId: string }) {
    const slug = await this.uniqueSlug(
      input.tenantId,
      input.slug || input.title || 'collection',
    );
    const productIds = input.productIds ?? [];

    const collection = await this.prisma.collection.create({
      data: {
        tenantId: input.tenantId,
        title: input.title ?? 'Untitled collection',
        slug,
        description: input.description ?? '',
        coverImage: input.coverImage ?? '',
        seoTitle: input.seoTitle ?? input.title ?? '',
        seoDescription: input.seoDescription ?? '',
        themeOverride: input.themeOverride
          ? (input.themeOverride as unknown as Prisma.InputJsonValue)
          : undefined,
        products: {
          create: productIds.map((productId, position) => ({
            productId,
            position,
          })),
        },
      },
      include: PRODUCTS_INCLUDE,
    });
    return mapCollection(collection);
  }

  async update(id: string, tenantId: string, input: Partial<Collection>) {
    const existing = await this.prisma.collection.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException(`Collection ${id} not found`);

    // Same rule as products — slug only moves when explicitly changed.
    const slug =
      input.slug && input.slug !== existing.slug
        ? await this.uniqueSlug(tenantId, input.slug, existing.id)
        : existing.slug;

    const collection = await this.prisma.$transaction(async (tx) => {
      if (input.productIds) {
        await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
        if (input.productIds.length > 0) {
          await tx.collectionProduct.createMany({
            data: input.productIds.map((productId, position) => ({
              collectionId: id,
              productId,
              position,
            })),
          });
        }
      }
      const data: Prisma.CollectionUpdateInput = {
        title: input.title ?? existing.title,
        slug,
        description: input.description ?? existing.description,
        coverImage: input.coverImage ?? existing.coverImage,
        seoTitle: input.seoTitle ?? existing.seoTitle,
        seoDescription: input.seoDescription ?? existing.seoDescription,
      };
      if (input.themeOverride !== undefined) {
        data.themeOverride =
          input.themeOverride === null
            ? Prisma.JsonNull
            : (input.themeOverride as unknown as Prisma.InputJsonValue);
      }

      return tx.collection.update({
        where: { id },
        data,
        include: PRODUCTS_INCLUDE,
      });
    });
    return mapCollection(collection);
  }

  async remove(id: string, tenantId: string): Promise<{ id: string }> {
    const existing = await this.prisma.collection.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException(`Collection ${id} not found`);
    await this.prisma.collection.delete({ where: { id: existing.id } });
    return { id: existing.id };
  }

  private async uniqueSlug(
    tenantId: string,
    base: string,
    excludeId?: string,
  ): Promise<string> {
    const root = slugify(base) || 'collection';
    let candidate = root;
    let suffix = 2;
    while (
      await this.prisma.collection.findFirst({
        where: {
          tenantId,
          slug: candidate,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      })
    ) {
      candidate = `${root}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
