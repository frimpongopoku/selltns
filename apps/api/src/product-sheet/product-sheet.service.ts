import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma, type Product as PrismaProduct } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { ProductsService, optionsOf } from '../products/products.service';
import { MAX_BULK_TITLE_LENGTH } from '../products/products.constants';
import { productLabel } from '../common/product-label';

// The product sheet: a no-login team link (like Photo Drop) where the team
// suggests edits to existing products and adds new ones from gallery
// photos. Every change is stored as a ProductSuggestion; nothing touches a
// live product until the admin publishes it.

const MAX_NEW_SUGGESTIONS = 500;
const MAX_IDS = 500;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_IMAGES = 20;
const MAX_AUTHOR_LENGTH = 60;

// What the team can change. Affiliate pricing is deliberately left out.
const FIELDS = [
  'title',
  'description',
  'price',
  'discountPrice',
  'stock',
  'trackStock',
  'sizes',
  'colors',
  'isActive',
] as const;
type Field = (typeof FIELDS)[number];

export interface SheetChanges {
  title?: string;
  description?: string;
  price?: number;
  discountPrice?: number | null;
  stock?: number;
  trackStock?: boolean;
  sizes?: string[];
  colors?: string[];
  isActive?: boolean;
  // New products only: gallery photo URLs.
  images?: string[];
}

// The product as the team sees it — no affiliate details.
export interface SheetProduct {
  id: string;
  number: number;
  title: string;
  description: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  trackStock: boolean;
  sizes: string[];
  colors: string[];
  isActive: boolean;
  images: string[];
  imageFocus: Record<string, string>;
}

export interface SuggestionView {
  id: string;
  productId: string | null;
  changes: SheetChanges;
  base: SheetChanges;
  author: string;
  updatedAt: Date;
}

function sheetProduct(p: PrismaProduct): SheetProduct {
  return {
    id: p.id,
    number: p.number,
    title: p.title,
    description: p.description,
    price: p.price,
    discountPrice: p.discountPrice,
    stock: p.stock,
    trackStock: p.trackStock,
    sizes: p.sizes,
    colors: p.colors,
    isActive: p.isActive,
    images: p.images,
    imageFocus: p.imageFocus as Record<string, string>,
  };
}

function suggestionView(s: {
  id: string;
  productId: string | null;
  changes: Prisma.JsonValue;
  base: Prisma.JsonValue;
  author: string;
  updatedAt: Date;
}): SuggestionView {
  return {
    id: s.id,
    productId: s.productId,
    changes: s.changes as SheetChanges,
    base: s.base as SheetChanges,
    author: s.author,
    updatedAt: s.updatedAt,
  };
}

function newToken(): string {
  // ~128 bits, URL-safe — the link itself is the only key to the sheet.
  return randomBytes(16).toString('base64url');
}

function money(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new BadRequestException(`${label} must be 0 or more.`);
  }
  return value;
}

function flag(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${label} must be true or false.`);
  }
  return value;
}

function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${label} must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new BadRequestException(
      `${label} must be ${max} characters or fewer.`,
    );
  }
  return trimmed;
}

// Checks every field the team sent; anything not listed is ignored.
function parseChanges(raw: unknown): SheetChanges {
  if (typeof raw !== 'object' || raw === null) {
    throw new BadRequestException('Send the product details as an object.');
  }
  const r = raw as Record<string, unknown>;
  const out: SheetChanges = {};
  if (r.title !== undefined)
    out.title = text(r.title, 'Name', MAX_BULK_TITLE_LENGTH);
  if (r.description !== undefined)
    out.description = text(
      r.description,
      'Description',
      MAX_DESCRIPTION_LENGTH,
    );
  if (r.price !== undefined) out.price = money(r.price, 'Price');
  if (r.discountPrice !== undefined) {
    out.discountPrice =
      r.discountPrice === null ? null : money(r.discountPrice, 'Sale price');
    if (out.discountPrice === 0) {
      throw new BadRequestException('Sale price must be more than 0.');
    }
  }
  if (r.stock !== undefined) out.stock = money(r.stock, 'Stock');
  if (r.trackStock !== undefined)
    out.trackStock = flag(r.trackStock, 'Track stock');
  if (r.sizes !== undefined) out.sizes = optionsOf(r.sizes, 'sizes');
  if (r.colors !== undefined) out.colors = optionsOf(r.colors, 'colors');
  if (r.isActive !== undefined) out.isActive = flag(r.isActive, 'Live');
  return out;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

function checkSalePrice(price: number, sale: number | null | undefined) {
  if (sale != null && sale >= price) {
    throw new BadRequestException(
      'The sale price must be lower than the price.',
    );
  }
}

@Injectable()
export class ProductSheetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly products: ProductsService,
  ) {}

  // ---- Public (team link) -------------------------------------------------

  async resolveToken(token: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { productSheetToken: token },
      select: {
        id: true,
        productSheetEnabled: true,
        productSheetAll: true,
        productSheetProductIds: true,
        suspended: true,
      },
    });
    if (!tenant || !tenant.productSheetEnabled || tenant.suspended) {
      throw new NotFoundException("This product sheet link isn't active.");
    }
    return tenant;
  }

  async publicView(token: string) {
    const sheet = await this.resolveToken(token);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: sheet.id },
      select: { name: true, logoUrl: true, themeTokens: true },
    });
    const newProducts = await this.prisma.productSuggestion.findMany({
      where: { tenantId: sheet.id, productId: null },
      orderBy: { createdAt: 'desc' },
    });
    return {
      shop: tenant,
      allProducts: sheet.productSheetAll,
      newProducts: newProducts.map(suggestionView),
    };
  }

  async listProducts(
    token: string,
    params: { cursor?: string; q?: string },
  ): Promise<{
    items: (SheetProduct & { suggestion: SuggestionView | null })[];
    nextCursor: string | null;
  }> {
    const sheet = await this.resolveToken(token);
    const page = await this.products.findAllPaginated(sheet.id, {
      cursor: params.cursor,
      q: params.q,
      limit: 30,
      ids: sheet.productSheetAll ? undefined : sheet.productSheetProductIds,
    });
    const suggestions = await this.prisma.productSuggestion.findMany({
      where: { productId: { in: page.items.map((p) => p.id) } },
    });
    const byProduct = new Map(suggestions.map((s) => [s.productId, s]));
    return {
      items: page.items.map((p) => {
        const s = byProduct.get(p.id);
        return { ...sheetProduct(p), suggestion: s ? suggestionView(s) : null };
      }),
      nextCursor: page.nextCursor,
    };
  }

  // Saves the team's version of one product. `raw` is the whole form; only
  // fields that differ from the live product are kept. If nothing differs
  // any more, the suggestion is removed.
  async saveEdit(
    token: string,
    productId: string,
    raw: unknown,
    author: unknown,
  ): Promise<SuggestionView | null> {
    const sheet = await this.resolveToken(token);
    if (
      !sheet.productSheetAll &&
      !sheet.productSheetProductIds.includes(productId)
    ) {
      throw new NotFoundException("This product isn't on the sheet.");
    }
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: sheet.id },
    });
    if (!product) throw new NotFoundException('This product no longer exists.');

    const form = parseChanges(raw);
    const live = sheetProduct(product) as unknown as Record<Field, unknown>;
    const existing = await this.prisma.productSuggestion.findUnique({
      where: { productId },
    });
    const oldBase = (existing?.base ?? {}) as Record<string, unknown>;
    const changes: Record<string, unknown> = {};
    const base: Record<string, unknown> = {};
    for (const field of FIELDS) {
      if (form[field] === undefined) continue;
      if (sameValue(form[field], live[field])) continue;
      changes[field] = form[field];
      base[field] = field in oldBase ? oldBase[field] : live[field];
    }
    checkSalePrice(
      (changes.price as number | undefined) ?? product.price,
      'discountPrice' in changes
        ? (changes.discountPrice as number | null)
        : product.discountPrice,
    );

    if (Object.keys(changes).length === 0) {
      if (existing) {
        await this.prisma.productSuggestion.delete({
          where: { id: existing.id },
        });
      }
      return null;
    }
    const data = {
      changes: changes as Prisma.InputJsonObject,
      base: base as Prisma.InputJsonObject,
      author: authorOf(author, existing?.author),
    };
    const saved = await this.prisma.productSuggestion.upsert({
      where: { productId },
      update: data,
      create: { ...data, tenantId: sheet.id, productId },
    });
    return suggestionView(saved);
  }

  async undoEdit(token: string, productId: string): Promise<void> {
    const sheet = await this.resolveToken(token);
    await this.prisma.productSuggestion.deleteMany({
      where: { tenantId: sheet.id, productId },
    });
  }

  async saveNew(
    token: string,
    id: string | null,
    raw: unknown,
    author: unknown,
  ): Promise<SuggestionView> {
    const sheet = await this.resolveToken(token);
    const changes = parseChanges(raw);
    if (changes.price === undefined) {
      throw new BadRequestException('A new product needs a price.');
    }
    checkSalePrice(changes.price, changes.discountPrice);
    changes.images = await this.galleryImages(
      sheet.id,
      (raw as Record<string, unknown>).images,
    );

    if (id) {
      const existing = await this.prisma.productSuggestion.findFirst({
        where: { id, tenantId: sheet.id, productId: null },
      });
      if (!existing) throw new NotFoundException('This new product is gone.');
      const saved = await this.prisma.productSuggestion.update({
        where: { id },
        data: {
          changes: changes as Prisma.InputJsonObject,
          author: authorOf(author, existing.author),
        },
      });
      return suggestionView(saved);
    }

    const count = await this.prisma.productSuggestion.count({
      where: { tenantId: sheet.id, productId: null },
    });
    if (count >= MAX_NEW_SUGGESTIONS) {
      throw new BadRequestException(
        `The sheet can hold ${MAX_NEW_SUGGESTIONS} new products — ask the shop to review some first.`,
      );
    }
    const saved = await this.prisma.productSuggestion.create({
      data: {
        tenantId: sheet.id,
        changes: changes as Prisma.InputJsonObject,
        author: authorOf(author, ''),
      },
    });
    return suggestionView(saved);
  }

  async removeNew(token: string, id: string): Promise<void> {
    const sheet = await this.resolveToken(token);
    await this.prisma.productSuggestion.deleteMany({
      where: { id, tenantId: sheet.id, productId: null },
    });
  }

  async gallery(token: string, params: { cursor?: string; q?: string }) {
    const sheet = await this.resolveToken(token);
    const page = await this.media.findAll(sheet.id, {
      cursor: params.cursor,
      q: params.q,
    });
    return {
      items: page.items.map((a) => ({
        id: a.id,
        url: a.url,
        thumbUrl: a.thumbUrl,
        title: a.title,
        focusX: a.focusX,
        focusY: a.focusY,
      })),
      nextCursor: page.nextCursor,
    };
  }

  // Only photos already in this shop's gallery.
  private async galleryImages(tenantId: string, raw: unknown) {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      throw new BadRequestException('images must be a list of photo links.');
    }
    const urls = [
      ...new Set(raw.filter((u): u is string => typeof u === 'string')),
    ];
    if (urls.length > MAX_IMAGES) {
      throw new BadRequestException(
        `A product can have at most ${MAX_IMAGES} photos.`,
      );
    }
    if (urls.length === 0) return [];
    const found = await this.prisma.mediaAsset.findMany({
      where: { tenantId, url: { in: urls } },
      select: { url: true },
    });
    const known = new Set(found.map((a) => a.url));
    return urls.filter((u) => known.has(u));
  }

  // ---- Admin --------------------------------------------------------------

  async adminView(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        productSheetToken: true,
        productSheetEnabled: true,
        productSheetAll: true,
        productSheetProductIds: true,
      },
    });
    const suggestions = await this.prisma.productSuggestion.findMany({
      where: { tenantId },
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      link: {
        token: tenant.productSheetToken,
        enabled: tenant.productSheetEnabled,
        allProducts: tenant.productSheetAll,
        productIds: tenant.productSheetProductIds,
      },
      suggestions: suggestions.map((s) => ({
        ...suggestionView(s),
        product: s.product ? sheetProduct(s.product) : null,
      })),
    };
  }

  // The products chosen for the sheet when it isn't showing all of them.
  async scopeProducts(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { productSheetProductIds: true },
    });
    return this.prisma.product.findMany({
      where: { tenantId, id: { in: tenant.productSheetProductIds } },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async pendingCount(tenantId: string): Promise<{ count: number }> {
    const count = await this.prisma.productSuggestion.count({
      where: { tenantId },
    });
    return { count };
  }

  async setEnabled(tenantId: string, enabled: unknown) {
    const on = flag(enabled, 'enabled');
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { productSheetToken: true },
    });
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        productSheetEnabled: on,
        // First switch-on creates the link.
        ...(on && !tenant.productSheetToken
          ? { productSheetToken: newToken() }
          : {}),
      },
      select: { productSheetToken: true, productSheetEnabled: true },
    });
    return {
      token: updated.productSheetToken,
      enabled: updated.productSheetEnabled,
    };
  }

  async regenerate(tenantId: string) {
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { productSheetToken: newToken() },
      select: { productSheetToken: true, productSheetEnabled: true },
    });
    return {
      token: updated.productSheetToken,
      enabled: updated.productSheetEnabled,
    };
  }

  async setScope(tenantId: string, allProducts: unknown, rawIds: unknown) {
    const all = flag(allProducts, 'allProducts');
    let ids: string[] = [];
    if (!all) {
      ids = normalizeIds(rawIds, 5000);
      const found = await this.prisma.product.findMany({
        where: { tenantId, id: { in: ids } },
        select: { id: true },
      });
      const known = new Set(found.map((p) => p.id));
      ids = ids.filter((id) => known.has(id));
    }
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { productSheetAll: all, productSheetProductIds: ids },
    });
    return { allProducts: all, productIds: ids };
  }

  // Applies suggestions to the live catalog, one at a time so one bad row
  // doesn't block the rest. Published ones are removed; failures stay for
  // the admin to fix or discard.
  async publish(tenantId: string, rawIds: unknown) {
    const ids = normalizeIds(rawIds, MAX_IDS);
    const suggestions = await this.prisma.productSuggestion.findMany({
      where: { tenantId, id: { in: ids } },
      include: { product: true },
    });
    const failed: { id: string; error: string }[] = [];
    let published = 0;
    for (const s of suggestions) {
      const changes = s.changes as SheetChanges;
      try {
        if (s.productId) {
          await this.products.update(s.productId, tenantId, changes);
        } else {
          await this.products.create({ ...changes, tenantId });
        }
        await this.prisma.productSuggestion.delete({ where: { id: s.id } });
        published += 1;
      } catch (err) {
        const name = s.product
          ? productLabel(s.product)
          : changes.title || 'New product';
        failed.push({
          id: s.id,
          error: `${name}: ${err instanceof Error ? err.message : 'could not be saved'}`,
        });
      }
    }
    return { published, failed };
  }

  async discard(tenantId: string, rawIds: unknown) {
    const ids = normalizeIds(rawIds, MAX_IDS);
    const { count } = await this.prisma.productSuggestion.deleteMany({
      where: { tenantId, id: { in: ids } },
    });
    return { discarded: count };
  }
}

function normalizeIds(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) throw new BadRequestException('ids must be a list.');
  const ids = [
    ...new Set(raw.filter((v): v is string => typeof v === 'string')),
  ];
  if (ids.length > max) {
    throw new BadRequestException(`At most ${max} at a time.`);
  }
  return ids;
}

function authorOf(raw: unknown, fallback = ''): string {
  if (typeof raw !== 'string') return fallback;
  return raw.trim().slice(0, MAX_AUTHOR_LENGTH) || fallback;
}
