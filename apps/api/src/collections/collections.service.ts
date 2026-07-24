import { Injectable, NotFoundException } from '@nestjs/common';
import { collections as seedCollections } from '../common/seed-data';
import { Collection } from '../common/types';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CollectionsService {
  private collections: Collection[] = [...seedCollections];

  constructor(private readonly productsService: ProductsService) {}

  findAll() {
    return this.collections.map((c) => this.withProducts(c));
  }

  findOne(idOrSlug: string) {
    const collection = this.collections.find(
      (c) => c.id === idOrSlug || c.slug === idOrSlug,
    );
    if (!collection)
      throw new NotFoundException(`Collection ${idOrSlug} not found`);
    return this.withProducts(collection);
  }

  create(input: Partial<Collection>): Collection {
    const collection: Collection = {
      id: `col_${Date.now()}`,
      tenantId: 'tenant_demo',
      title: input.title ?? 'Untitled collection',
      slug:
        input.slug ??
        (input.title ?? 'untitled')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      description: input.description ?? '',
      themeOverride: input.themeOverride ?? null,
      seoTitle: input.seoTitle ?? input.title ?? '',
      seoDescription: input.seoDescription ?? '',
      productIds: input.productIds ?? [],
      coverImage: input.coverImage ?? '',
    };
    this.collections = [collection, ...this.collections];
    return collection;
  }

  update(id: string, input: Partial<Collection>): Collection {
    const existing = this.collections.find((c) => c.id === id);
    if (!existing) throw new NotFoundException(`Collection ${id} not found`);
    const updated = { ...existing, ...input, id: existing.id };
    this.collections = this.collections.map((c) =>
      c.id === existing.id ? updated : c,
    );
    return updated;
  }

  remove(id: string): { id: string } {
    const existing = this.collections.find((c) => c.id === id);
    if (!existing) throw new NotFoundException(`Collection ${id} not found`);
    this.collections = this.collections.filter((c) => c.id !== existing.id);
    return { id: existing.id };
  }

  private withProducts(collection: Collection) {
    return {
      ...collection,
      products: collection.productIds
        .map((id) => {
          try {
            return this.productsService.findOne(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    };
  }
}
