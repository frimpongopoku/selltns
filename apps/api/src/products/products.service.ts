import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';
import type { Product } from '../common/types';
import type { Product as PrismaProduct } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string): Promise<PrismaProduct[]> {
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findOne(idOrSlug: string, tenantId: string): Promise<PrismaProduct> {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!product) throw new NotFoundException(`Product ${idOrSlug} not found`);
    return product;
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
