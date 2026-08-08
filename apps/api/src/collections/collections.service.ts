import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Product as PrismaProduct } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';
import { normalizeTags } from '../common/normalize-tags';
import { decodeCreatedAtCursor, encodeCreatedAtCursor } from '../common/cursor';
import {
  COLLECTIONS_PAGE_SIZE,
  COLLECTIONS_PAGE_SIZE_MAX,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_COLLECTION,
} from './collections.constants';
import type { Collection, ThemeTokens } from '../common/types';
import { getPreorderInfoMap } from '../common/preorder-info';

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
  tags: string[];
  createdAt: Date;
  themeOverride: Prisma.JsonValue | null;
  type: 'STANDARD' | 'PREORDER';
  depositType: 'FULL' | 'PERCENTAGE' | null;
  depositPercentage: number | null;
  fulfillmentNote: string;
  isActive: boolean;
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
    tags: row.tags,
    themeOverride: row.themeOverride as ThemeTokens | null,
    type: row.type,
    depositType: row.depositType,
    depositPercentage: row.depositPercentage,
    fulfillmentNote: row.fulfillmentNote,
    isActive: row.isActive,
    productIds: row.products.map((cp) => cp.productId),
    products: row.products.map((cp) => cp.product),
  };
}

function tagsOf(input: Partial<Collection>) {
  return normalizeTags(input.tags, {
    maxTags: MAX_TAGS_PER_COLLECTION,
    maxTagLength: MAX_TAG_LENGTH,
    noun: 'collection',
  });
}

// PREORDER collections need a deposit rule; STANDARD ones must not carry
// stale deposit config from a previous edit, so this always resolves the
// full set together rather than patching fields independently.
function preorderFieldsOf(
  input: Pick<
    Partial<Collection>,
    'type' | 'depositType' | 'depositPercentage' | 'fulfillmentNote'
  >,
  existing?: {
    type: 'STANDARD' | 'PREORDER';
    depositType: 'FULL' | 'PERCENTAGE' | null;
    depositPercentage: number | null;
    fulfillmentNote: string;
  },
) {
  const type = input.type ?? existing?.type ?? 'STANDARD';
  if (type === 'STANDARD') {
    return {
      type,
      depositType: null,
      depositPercentage: null,
      fulfillmentNote: '',
    };
  }
  const depositType = input.depositType ?? existing?.depositType ?? 'FULL';
  const depositPercentage =
    depositType === 'PERCENTAGE'
      ? Math.min(
          99,
          Math.max(
            1,
            Math.round(
              input.depositPercentage ?? existing?.depositPercentage ?? 50,
            ),
          ),
        )
      : null;
  const fulfillmentNote =
    input.fulfillmentNote ?? existing?.fulfillmentNote ?? '';
  return { type, depositType, depositPercentage, fulfillmentNote };
}

export interface FindAllPaginatedParams {
  cursor?: string;
  limit?: number;
  q?: string;
  tag?: string;
}

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  // A collection's own `type: 'PREORDER'` only marks the collection —
  // nothing on Product itself says "I'm a pre-order item", so the storefront
  // relies on each nested product carrying its own `preorder` field (same
  // shape ProductsService attaches when fetching products directly). Without
  // this, a product listed inside a pre-order collection would render with
  // the regular add-to-cart/stock UI instead of the reserve/deposit one.
  private async withProductPreorderInfo<
    T extends { tenantId: string; products: PrismaProduct[] },
  >(collections: T[]): Promise<T[]> {
    const productIds = [
      ...new Set(collections.flatMap((c) => c.products.map((p) => p.id))),
    ];
    if (productIds.length === 0) return collections;
    const tenantId = collections[0].tenantId;
    const byProductId = await getPreorderInfoMap(
      this.prisma,
      tenantId,
      productIds,
    );
    return collections.map((c) => ({
      ...c,
      products: c.products.map((p) => ({
        ...p,
        preorder: byProductId.get(p.id) ?? null,
      })),
    }));
  }

  async findAll(tenantId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { tenantId },
      include: PRODUCTS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return this.withProductPreorderInfo(collections.map(mapCollection));
  }

  // Paginates the collections table directly via raw SQL (for search/cursor),
  // then hydrates product relations for just that page via the normal Prisma
  // include — simpler and safer than hand-rolling the join in raw SQL.
  async findAllPaginated(tenantId: string, params: FindAllPaginatedParams) {
    const limit = Math.min(
      Math.max(params.limit ?? COLLECTIONS_PAGE_SIZE, 1),
      COLLECTIONS_PAGE_SIZE_MAX,
    );
    const cursor = decodeCreatedAtCursor(params.cursor);
    const q = params.q?.trim();

    const searchClause = q
      ? Prisma.sql`AND (title ILIKE ${'%' + q + '%'} OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE ${'%' + q + '%'}))`
      : Prisma.empty;
    const tagClause = params.tag
      ? Prisma.sql`AND ${params.tag} = ANY(tags)`
      : Prisma.empty;
    const cursorClause = cursor
      ? Prisma.sql`AND (created_at, id) < (${cursor.createdAt}, ${cursor.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      { id: string; created_at: Date }[]
    >`
      SELECT id, created_at
      FROM collections
      WHERE tenant_id = ${tenantId}
      ${searchClause}
      ${tagClause}
      ${cursorClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const ids = pageRows.map((r) => r.id);

    const collections = ids.length
      ? await this.prisma.collection.findMany({
          where: { id: { in: ids } },
          include: PRODUCTS_INCLUDE,
        })
      : [];
    const byId = new Map(collections.map((c) => [c.id, c]));
    const items = await this.withProductPreorderInfo(
      ids
        .map((id) => byId.get(id))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map(mapCollection),
    );

    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCreatedAtCursor({ createdAt: last.created_at, id: last.id })
        : null;

    return { items, nextCursor };
  }

  async findDistinctTags(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) AS tag
      FROM collections
      WHERE tenant_id = ${tenantId}
      ORDER BY tag ASC
    `;
    return rows.map((r) => r.tag);
  }

  async findOne(idOrSlug: string, tenantId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { tenantId, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: PRODUCTS_INCLUDE,
    });
    if (!collection)
      throw new NotFoundException(`Collection ${idOrSlug} not found`);
    const [withPreorder] = await this.withProductPreorderInfo([
      mapCollection(collection),
    ]);
    return withPreorder;
  }

  async create(input: Partial<Collection> & { tenantId: string }) {
    const slug = await this.uniqueSlug(
      input.tenantId,
      input.slug || input.title || 'collection',
    );
    const productIds = input.productIds ?? [];
    const preorder = preorderFieldsOf(input);

    const collection = await this.prisma.collection.create({
      data: {
        tenantId: input.tenantId,
        title: input.title ?? 'Untitled collection',
        slug,
        description: input.description ?? '',
        coverImage: input.coverImage ?? '',
        seoTitle: input.seoTitle ?? input.title ?? '',
        seoDescription: input.seoDescription ?? '',
        tags: tagsOf(input),
        themeOverride: input.themeOverride
          ? (input.themeOverride as unknown as Prisma.InputJsonValue)
          : undefined,
        type: preorder.type,
        depositType: preorder.depositType,
        depositPercentage: preorder.depositPercentage,
        fulfillmentNote: preorder.fulfillmentNote,
        isActive: input.isActive ?? true,
        products: {
          create: productIds.map((productId, position) => ({
            productId,
            position,
          })),
        },
      },
      include: PRODUCTS_INCLUDE,
    });
    const [withPreorder] = await this.withProductPreorderInfo([
      mapCollection(collection),
    ]);
    return withPreorder;
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
      const preorder = preorderFieldsOf(input, existing);
      const data: Prisma.CollectionUpdateInput = {
        title: input.title ?? existing.title,
        slug,
        description: input.description ?? existing.description,
        coverImage: input.coverImage ?? existing.coverImage,
        seoTitle: input.seoTitle ?? existing.seoTitle,
        seoDescription: input.seoDescription ?? existing.seoDescription,
        tags: input.tags !== undefined ? tagsOf(input) : existing.tags,
        type: preorder.type,
        depositType: preorder.depositType,
        depositPercentage: preorder.depositPercentage,
        fulfillmentNote: preorder.fulfillmentNote,
        isActive: input.isActive ?? existing.isActive,
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
    const [withPreorder] = await this.withProductPreorderInfo([
      mapCollection(collection),
    ]);
    return withPreorder;
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
