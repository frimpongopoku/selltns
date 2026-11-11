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
import type {
  Collection,
  CollectionInput,
  CollectionItemRef,
  PreorderInfo,
  ThemeTokens,
} from '../common/types';
import { getPreorderInfoMap } from '../common/preorder-info';
import { imageFocusFor } from '../common/image-focus';
import { AffiliatesService } from '../affiliates/affiliates.service';

// Ordered by the per-collection position column — the vendor arranges it
// from the collection's edit page (itemOrder on save, see positionsOf) —
// with each product's own displayOrder as a tiebreaker. Existing rows were
// backfilled from displayOrder (see the
// backfill_collection_product_positions migration), so collections nobody
// has rearranged keep the order they had before.
const PRODUCTS_INCLUDE = {
  products: {
    orderBy: [
      { position: 'asc' as const },
      { product: { displayOrder: 'asc' as const } },
    ],
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
  unfurlImage: string | null;
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
    unfurlImage: row.unfurlImage,
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

// Interleaves a collection's own products with its affiliate items by their
// shared position column — both lists arrive already sorted, so this is a
// plain merge. Ties (only possible for rows never re-saved since positions
// became shared) keep the collection's own product first.
function mergeByPosition<A, B>(
  native: { position: number; product: A }[],
  affiliate: { position: number; product: B }[],
): (A | B)[] {
  const merged: (A | B)[] = [];
  let i = 0;
  let j = 0;
  while (i < native.length || j < affiliate.length) {
    if (
      j >= affiliate.length ||
      (i < native.length && native[i].position <= affiliate[j].position)
    ) {
      merged.push(native[i++].product);
    } else {
      merged.push(affiliate[j++].product);
    }
  }
  return merged;
}

// Positions for the collection's own products: their index in itemOrder
// when the caller sent one, else their index in productIds (the only order
// a caller that doesn't know about itemOrder can express).
function positionsOf(input: CollectionInput): Map<string, number> {
  const positions = new Map<string, number>();
  if (input.itemOrder) {
    input.itemOrder.forEach((ref, index) => {
      if ('productId' in ref) positions.set(ref.productId, index);
    });
  }
  (input.productIds ?? []).forEach((productId, index) => {
    if (!positions.has(productId)) positions.set(productId, index);
  });
  return positions;
}

function affiliatePositionsOf(itemOrder: CollectionItemRef[] | undefined) {
  return (itemOrder ?? []).flatMap((ref, position) =>
    'listingId' in ref ? [{ listingId: ref.listingId, position }] : [],
  );
}

function withAffiliateItems<
  T extends { productIds: string[]; products: PrismaProduct[] },
>(
  collection: T,
  nativePositions: number[],
  affiliateItems: { position: number; product: { id: string } }[],
): T {
  // Affiliate products are the API's mapped Product shape rather than a
  // Prisma row — same mix the storefront has always received here.
  const products = mergeByPosition(
    collection.products.map((product, index) => ({
      position: nativePositions[index] ?? index,
      product,
    })),
    affiliateItems,
  ) as T['products'];
  return { ...collection, productIds: products.map((p) => p.id), products };
}

function positionsByCollection(
  rows: { id: string; products: { position: number }[] }[],
) {
  return new Map(rows.map((r) => [r.id, r.products.map((cp) => cp.position)]));
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly affiliatesService: AffiliatesService,
  ) {}

  // A collection's own `type: 'PREORDER'` only marks the collection —
  // nothing on Product itself says "I'm a pre-order item", so the storefront
  // relies on each nested product carrying its own `preorder` field (same
  // shape ProductsService attaches when fetching products directly). Without
  // this, a product listed inside a pre-order collection would render with
  // the regular add-to-cart/stock UI instead of the reserve/deposit one.
  private async withProductPreorderInfo<
    T extends {
      tenantId: string;
      coverImage: string;
      products: PrismaProduct[];
    },
  >(collections: T[]): Promise<(T & { coverPosition: string | null })[]> {
    if (collections.length === 0) return [];
    const tenantId = collections[0].tenantId;
    const productIds = [
      ...new Set(collections.flatMap((c) => c.products.map((p) => p.id))),
    ];
    const [byProductId, coverFocus] = await Promise.all([
      productIds.length
        ? getPreorderInfoMap(this.prisma, tenantId, productIds)
        : new Map<string, PreorderInfo>(),
      // Looked up on every read rather than copied onto the collection, so
      // a focus change in the gallery shows up right away.
      imageFocusFor(
        this.prisma,
        tenantId,
        collections.map((c) => c.coverImage).filter(Boolean),
      ),
    ]);
    return collections.map((c) => ({
      ...c,
      coverPosition: coverFocus[c.coverImage] ?? null,
      products: c.products.map((p) => ({
        ...p,
        preorder: byProductId.get(p.id) ?? null,
      })),
    }));
  }

  // includeAffiliate mirrors findOne's flag — merges each collection's
  // active affiliate items into its products/productIds too, same
  // native-then-affiliate ordering, so a list-level product count (e.g.
  // the storefront home page's "N pieces" badge) isn't native-only and
  // wrongly showing 0 for an affiliate-only collection.
  async findAll(tenantId: string, includeAffiliate = false) {
    const collections = await this.prisma.collection.findMany({
      where: { tenantId },
      include: PRODUCTS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    const withPreorder = await this.withProductPreorderInfo(
      collections.map(mapCollection),
    );
    if (!includeAffiliate) return withPreorder;
    return this.mergeAffiliateItems(
      withPreorder,
      positionsByCollection(collections),
    );
  }

  // Paginates the collections table directly via raw SQL (for search/cursor),
  // then hydrates product relations for just that page via the normal Prisma
  // include — simpler and safer than hand-rolling the join in raw SQL.
  async findAllPaginated(
    tenantId: string,
    params: FindAllPaginatedParams,
    includeAffiliate = false,
  ) {
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
    let items = await this.withProductPreorderInfo(
      ids
        .map((id) => byId.get(id))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map(mapCollection),
    );
    if (includeAffiliate) {
      items = await this.mergeAffiliateItems(
        items,
        positionsByCollection(collections),
      );
    }

    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCreatedAtCursor({ createdAt: last.created_at, id: last.id })
        : null;

    return { items, nextCursor };
  }

  // Shared by findAll/findAllPaginated — batches every listed collection's
  // affiliate items into one query (AffiliatesService.
  // getActiveCollectionItemsForMany) instead of the N+1 a per-collection
  // getActiveCollectionItems() call in a loop would cost here. Same
  // position-interleaved order as findOne's single-collection merge;
  // nativePositions holds each collection's own products' positions, in the
  // same order as its `products`.
  private async mergeAffiliateItems<
    T extends { id: string; productIds: string[]; products: PrismaProduct[] },
  >(collections: T[], nativePositions: Map<string, number[]>): Promise<T[]> {
    const byCollectionId =
      await this.affiliatesService.getActiveCollectionItemsForMany(
        collections.map((c) => c.id),
      );
    if (byCollectionId.size === 0) return collections;
    return collections.map((c) => {
      const affiliateItems = byCollectionId.get(c.id);
      if (!affiliateItems || affiliateItems.length === 0) return c;
      return withAffiliateItems(
        c,
        nativePositions.get(c.id) ?? [],
        affiliateItems,
      );
    });
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

  // includeAffiliate merges in active affiliate-listed products this
  // collection's owner has placed here, interleaved by position — the
  // storefront and the admin edit page (which orders both kinds together)
  // pass this.
  async findOne(idOrSlug: string, tenantId: string, includeAffiliate = false) {
    const collection = await this.prisma.collection.findFirst({
      where: { tenantId, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: PRODUCTS_INCLUDE,
    });
    if (!collection)
      throw new NotFoundException(`Collection ${idOrSlug} not found`);
    const [withPreorder] = await this.withProductPreorderInfo([
      mapCollection(collection),
    ]);
    if (!includeAffiliate) return withPreorder;

    const affiliateItems =
      await this.affiliatesService.getActiveCollectionItems(withPreorder.id);
    if (affiliateItems.length === 0) return withPreorder;
    return withAffiliateItems(
      withPreorder,
      collection.products.map((cp) => cp.position),
      affiliateItems,
    );
  }

  async create(input: CollectionInput & { tenantId: string }) {
    const slug = await this.uniqueSlug(
      input.tenantId,
      input.slug || input.title || 'collection',
    );
    const productIds = input.productIds ?? [];
    const positions = positionsOf(input);
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
          create: productIds.map((productId) => ({
            productId,
            position: positions.get(productId) ?? 0,
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

  async update(id: string, tenantId: string, input: CollectionInput) {
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
        const positions = positionsOf(input);
        await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
        if (input.productIds.length > 0) {
          await tx.collectionProduct.createMany({
            data: input.productIds.map((productId) => ({
              collectionId: id,
              productId,
              position: positions.get(productId) ?? 0,
            })),
          });
        }
      }
      // Affiliate membership is added/removed through AffiliatesService;
      // here only the positions of items already in this collection move
      // (scoped by collectionId, so a stray listingId is a no-op).
      for (const { listingId, position } of affiliatePositionsOf(
        input.itemOrder,
      )) {
        await tx.affiliateCollectionItem.updateMany({
          where: { collectionId: id, listingId },
          data: { position },
        });
      }
      const preorder = preorderFieldsOf(input, existing);
      const data: Prisma.CollectionUpdateInput = {
        title: input.title ?? existing.title,
        slug,
        description: input.description ?? existing.description,
        coverImage: input.coverImage ?? existing.coverImage,
        unfurlImage:
          input.unfurlImage !== undefined
            ? input.unfurlImage
            : existing.unfurlImage,
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
