import { Injectable, NotFoundException } from '@nestjs/common';
import { products as seedProducts } from '../common/seed-data';
import { Product } from '../common/types';

@Injectable()
export class ProductsService {
  private products: Product[] = [...seedProducts];

  findAll(tenantId: string): Product[] {
    return this.products
      .filter((p) => p.tenantId === tenantId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  findOne(idOrSlug: string, tenantId: string): Product {
    const product = this.products.find(
      (p) => (p.id === idOrSlug || p.slug === idOrSlug) && p.tenantId === tenantId,
    );
    if (!product) throw new NotFoundException(`Product ${idOrSlug} not found`);
    return product;
  }

  create(input: Partial<Product> & { tenantId: string }): Product {
    const product: Product = {
      id: `prod_${Date.now()}`,
      tenantId: input.tenantId,
      title: input.title ?? 'Untitled product',
      slug:
        input.slug ??
        (input.title ?? 'untitled')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      description: input.description ?? '',
      price: input.price ?? 0,
      sku: input.sku ?? '',
      stock: input.stock ?? 0,
      isActive: input.isActive ?? true,
      images: input.images ?? [],
      displayOrder:
        input.displayOrder ??
        this.products
          .filter((p) => p.tenantId === input.tenantId)
          .reduce((max, p) => Math.max(max, p.displayOrder), -1) + 1,
      createdAt: new Date().toISOString(),
    };
    this.products = [product, ...this.products];
    return product;
  }

  update(id: string, tenantId: string, input: Partial<Product>): Product {
    const existing = this.findOne(id, tenantId);
    const updated = { ...existing, ...input, id: existing.id, tenantId: existing.tenantId };
    this.products = this.products.map((p) => (p.id === existing.id ? updated : p));
    return updated;
  }

  remove(id: string, tenantId: string): { id: string } {
    const existing = this.findOne(id, tenantId);
    this.products = this.products.filter((p) => p.id !== existing.id);
    return { id: existing.id };
  }
}
