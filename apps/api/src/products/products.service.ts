import { Injectable, NotFoundException } from '@nestjs/common';
import { products as seedProducts } from '../common/seed-data';
import { Product } from '../common/types';

@Injectable()
export class ProductsService {
  private products: Product[] = [...seedProducts];

  findAll(): Product[] {
    return this.products;
  }

  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id || p.slug === id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  create(input: Partial<Product>): Product {
    const product: Product = {
      id: `prod_${Date.now()}`,
      tenantId: 'tenant_demo',
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
      createdAt: new Date().toISOString(),
    };
    this.products = [product, ...this.products];
    return product;
  }

  update(id: string, input: Partial<Product>): Product {
    const existing = this.findOne(id);
    const updated = { ...existing, ...input, id: existing.id };
    this.products = this.products.map((p) => (p.id === existing.id ? updated : p));
    return updated;
  }

  remove(id: string): { id: string } {
    const existing = this.findOne(id);
    this.products = this.products.filter((p) => p.id !== existing.id);
    return { id: existing.id };
  }
}
