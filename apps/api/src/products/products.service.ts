import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';
import { normalizeTags } from '../common/normalize-tags';
import { decodeCursor, encodeCursor } from './products.utils';
import {
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_PRODUCT,
  PRODUCTS_PAGE_SIZE,
  PRODUCTS_PAGE_SIZE_MAX,
} from './products.constants';
import type { Product, PreorderInfo } from '../common/types';
import type { Product as PrismaProduct } from '@prisma/client';

export interface FindAllPaginatedParams {
  cursor?: string;
  limit?: number;
  q?: string;
  status?: 'active' | 'inactive' | 'all';
  tag?: string;
}

export type ProductWithPreorder = PrismaProduct & {
  preorder: PreorderInfo | null;
};

export interface FindAllPaginatedResult {
  items: ProductWithPreorder[];
  nextCursor: string | null;
}

function tagsOf(input: Partial<Product>) {
  return normalizeTags(input.tags, {
    maxTags: MAX_TAGS_PER_PRODUCT,
    maxTagLength: MAX_TAG_LENGTH,
    noun: 'product',
  });
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<ProductWithPreorder[]> {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { displayOrder: 'asc' },
    });
    return this.withPreorderInfo(tenantId, products);
  }

  // A product is a pre-order item purely by virtue of belonging to a
  // PREORDER-type collection — there's no flag on Product itself. Products
  // can only carry one active preorder ruleset, so if a product somehow
  // ends up in more than one PREORDER collection, the oldest one wins.
  private async withPreorderInfo<T extends { id: string }>(
    tenantId: string,
    products: T[],
  ): Promise<(T & { preorder: PreorderInfo | null })[]> {
    if (products.length === 0) return [];
    const ids = products.map((p) => p.id);
    const rows = await this.prisma.$queryRaw<
      {
        productId: string;
        collectionId: string;
        collectionTitle: string;
        depositType: 'FULL' | 'PERCENTAGE';
        depositPercentage: number | null;
        fulfillmentNote: string;
      }[]
    >`
      SELECT cp.product_id AS "productId", c.id AS "collectionId",
             c.title AS "collectionTitle", c.deposit_type AS "depositType",
             c.deposit_percentage AS "depositPercentage",
             c.fulfillment_note AS "fulfillmentNote"
      FROM collection_products cp
      JOIN collections c ON c.id = cp.collection_id
      WHERE c.tenant_id = ${tenantId}
        AND c.type = 'PREORDER'
        AND cp.product_id = ANY(${ids})
      ORDER BY c.created_at ASC
    `;
    const byProductId = new Map<string, PreorderInfo>();
    for (const row of rows) {
      if (byProductId.has(row.productId)) continue;
      byProductId.set(row.productId, {
        collectionId: row.collectionId,
        collectionTitle: row.collectionTitle,
        depositType: row.depositType,
        depositPercentage: row.depositPercentage,
        fulfillmentNote: row.fulfillmentNote,
      });
    }
    return products.map((p) => ({
      ...p,
      preorder: byProductId.get(p.id) ?? null,
    }));
  }

  async findAllPaginated(
    tenantId: string,
    params: FindAllPaginatedParams,
  ): Promise<FindAllPaginatedResult> {
    const limit = Math.min(
      Math.max(params.limit ?? PRODUCTS_PAGE_SIZE, 1),
      PRODUCTS_PAGE_SIZE_MAX,
    );
    const cursor = decodeCursor(params.cursor);
    const q = params.q?.trim();

    const searchClause = q
      ? Prisma.sql`AND (title ILIKE ${'%' + q + '%'} OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE ${'%' + q + '%'}))`
      : Prisma.empty;
    const statusClause =
      params.status === 'active'
        ? Prisma.sql`AND is_active = true`
        : params.status === 'inactive'
          ? Prisma.sql`AND is_active = false`
          : Prisma.empty;
    const tagClause = params.tag
      ? Prisma.sql`AND ${params.tag} = ANY(tags)`
      : Prisma.empty;
    const cursorClause = cursor
      ? Prisma.sql`AND (display_order, id) > (${cursor.displayOrder}, ${cursor.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<PrismaProduct[]>`
      SELECT id, tenant_id AS "tenantId", title, slug, description, price, sku, stock,
             is_active AS "isActive", images, tags, display_order AS "displayOrder",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM products
      WHERE tenant_id = ${tenantId}
      ${searchClause}
      ${statusClause}
      ${tagClause}
      ${cursorClause}
      ORDER BY display_order ASC, id ASC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ displayOrder: last.displayOrder, id: last.id })
        : null;
    const items = await this.withPreorderInfo(tenantId, pageRows);

    return { items, nextCursor };
  }

  async findDistinctTags(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) AS tag
      FROM products
      WHERE tenant_id = ${tenantId}
      ORDER BY tag ASC
    `;
    return rows.map((r) => r.tag);
  }

  async findOne(
    idOrSlug: string,
    tenantId: string,
  ): Promise<ProductWithPreorder> {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!product) throw new NotFoundException(`Product ${idOrSlug} not found`);
    const [withPreorder] = await this.withPreorderInfo(tenantId, [product]);
    return withPreorder;
  }

  async create(
    input: Partial<Product> & { tenantId: string },
  ): Promise<PrismaProduct> {
    const slug = await this.uniqueSlug(
      input.tenantId,
      input.slug || input.title || 'product',
    );
    const maxOrder = await this.prisma.product.aggregate({
      where: { tenantId: input.tenantId },
      _max: { displayOrder: true },
    });

    return this.prisma.product.create({
      data: {
        tenantId: input.tenantId,
        title: input.title ?? 'Untitled product',
        slug,
        description: input.description ?? '',
        price: input.price ?? 0,
        sku: input.sku ?? '',
        stock: input.stock ?? 0,
        isActive: input.isActive ?? true,
        images: input.images ?? [],
        tags: tagsOf(input),
        displayOrder:
          input.displayOrder ?? (maxOrder._max.displayOrder ?? -1) + 1,
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    input: Partial<Product>,
  ): Promise<PrismaProduct> {
    const existing = await this.findOne(id, tenantId);
    // Slug is only regenerated when explicitly changed — editing the title
    // shouldn't silently break a link someone already shared.
    const slug =
      input.slug && input.slug !== existing.slug
        ? await this.uniqueSlug(tenantId, input.slug, existing.id)
        : existing.slug;

    return this.prisma.product.update({
      where: { id: existing.id },
      data: {
        title: input.title ?? existing.title,
        slug,
        description: input.description ?? existing.description,
        price: input.price ?? existing.price,
        sku: input.sku ?? existing.sku,
        stock: input.stock ?? existing.stock,
        isActive: input.isActive ?? existing.isActive,
        images: input.images ?? existing.images,
        tags: input.tags !== undefined ? tagsOf(input) : existing.tags,
        displayOrder: input.displayOrder ?? existing.displayOrder,
      },
    });
  }

  async remove(id: string, tenantId: string): Promise<{ id: string }> {
    const existing = await this.findOne(id, tenantId);
    await this.prisma.product.delete({ where: { id: existing.id } });
    return { id: existing.id };
  }

  private async uniqueSlug(
    tenantId: string,
    base: string,
    excludeId?: string,
  ): Promise<string> {
    const root = slugify(base) || 'product';
    let candidate = root;
    let suffix = 2;
    while (
      await this.prisma.product.findFirst({
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
