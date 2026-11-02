import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { ProductsService, optionsOf } from '../products/products.service';
import type { Product } from '../common/types';

// Caps what an open, no-login link can pile up before the vendor reviews it.
const MAX_DROP_ITEMS = 1000;
const MAX_IDS = 500;
const MAX_TITLE_LENGTH = 120;

const itemInclude = {
  photos: { orderBy: { position: 'asc' } },
} satisfies Prisma.DropItemInclude;

type DropItemWithPhotos = Prisma.DropItemGetPayload<{
  include: typeof itemInclude;
}>;

export interface DropItemView {
  id: string;
  title: string;
  price: number | null;
  sizes: string[];
  colors: string[];
  createdAt: Date;
  photos: { id: string; url: string; thumbUrl: string }[];
}

export interface DropItemInput {
  title?: unknown;
  price?: unknown;
  sizes?: unknown;
  colors?: unknown;
}

function toView(item: DropItemWithPhotos): DropItemView {
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    sizes: item.sizes,
    colors: item.colors,
    createdAt: item.createdAt,
    photos: item.photos.map((p) => ({
      id: p.id,
      url: p.url,
      thumbUrl: p.thumbUrl,
    })),
  };
}

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw))
    throw new BadRequestException('ids must be an array');
  const ids = [
    ...new Set(raw.filter((v): v is string => typeof v === 'string')),
  ];
  if (ids.length > MAX_IDS) {
    throw new BadRequestException(`At most ${MAX_IDS} items at a time`);
  }
  return ids;
}

function newToken(): string {
  // ~128 bits, URL-safe — the link itself is the only key to the drop.
  return randomBytes(16).toString('base64url');
}

@Injectable()
export class PhotoDropService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly products: ProductsService,
  ) {}

  // ---- Public (team link) -------------------------------------------------

  async resolveToken(token: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { photoDropToken: token },
      select: { id: true, photoDropEnabled: true, suspended: true },
    });
    if (!tenant || !tenant.photoDropEnabled || tenant.suspended) {
      throw new NotFoundException("This photo drop link isn't active.");
    }
    return tenant.id;
  }

  async publicView(token: string) {
    const tenantId = await this.resolveToken(token);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, logoUrl: true },
    });
    return { shop: tenant, items: await this.listItems(tenantId) };
  }

  async upload(
    tenantId: string,
    file: Express.Multer.File | undefined,
  ): Promise<DropItemView> {
    const count = await this.prisma.dropItem.count({ where: { tenantId } });
    if (count >= MAX_DROP_ITEMS) {
      throw new BadRequestException(
        'This photo drop is full — ask the shop to review it first.',
      );
    }
    const photoId = randomUUID();
    const stored = await this.media.processAndStore(
      `tenants/${tenantId}/drops/${photoId}`,
      file,
    );
    const item = await this.prisma.dropItem.create({
      data: {
        tenantId,
        photos: { create: { id: photoId, ...stored } },
      },
      include: itemInclude,
    });
    return toView(item);
  }

  // ---- Shared by the team link and the admin ------------------------------

  async listItems(tenantId: string): Promise<DropItemView[]> {
    const items = await this.prisma.dropItem.findMany({
      where: { tenantId },
      include: itemInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return items.map(toView);
  }

  async updateItem(
    tenantId: string,
    id: string,
    input: DropItemInput,
  ): Promise<DropItemView> {
    const existing = await this.prisma.dropItem.findFirst({
      where: { id, tenantId },
    });
    if (!existing)
      throw new NotFoundException('That item is no longer in the drop.');

    const data: Prisma.DropItemUpdateInput = {};
    if (input.title !== undefined) {
      if (typeof input.title !== 'string') {
        throw new BadRequestException('Name must be text.');
      }
      data.title = input.title.trim().slice(0, MAX_TITLE_LENGTH);
    }
    if (input.price !== undefined) {
      if (input.price === null || input.price === '') {
        data.price = null;
      } else {
        const price = Number(input.price);
        if (!Number.isInteger(price) || price < 0) {
          throw new BadRequestException('Price must be a whole number of GHS.');
        }
        data.price = price;
      }
    }
    if (input.sizes !== undefined) data.sizes = optionsOf(input.sizes, 'sizes');
    if (input.colors !== undefined) {
      data.colors = optionsOf(input.colors, 'colors');
    }

    const item = await this.prisma.dropItem.update({
      where: { id },
      data,
      include: itemInclude,
    });
    return toView(item);
  }

  // Merges items into the first id given: its photos come first (its cover
  // stays the cover), the rest follow in the order given. Details the first
  // item lacks are filled from the others.
  async group(tenantId: string, rawIds: unknown): Promise<DropItemView> {
    const ids = normalizeIds(rawIds);
    const found = await this.prisma.dropItem.findMany({
      where: { id: { in: ids }, tenantId },
      include: itemInclude,
    });
    const items = ids
      .map((id) => found.find((i) => i.id === id))
      .filter((i): i is DropItemWithPhotos => !!i);
    if (items.length < 2) {
      throw new BadRequestException('Pick at least two items to group.');
    }
    const [target, ...rest] = items;
    const photos = items.flatMap((i) => i.photos);
    const firstWith = <T>(
      pick: (i: DropItemWithPhotos) => T,
      empty: (v: T) => boolean,
    ) => pick(items.find((i) => !empty(pick(i))) ?? target);

    await this.prisma.$transaction([
      ...photos.map((p, position) =>
        this.prisma.dropPhoto.update({
          where: { id: p.id },
          data: { itemId: target.id, position },
        }),
      ),
      this.prisma.dropItem.update({
        where: { id: target.id },
        data: {
          title: firstWith(
            (i) => i.title,
            (v) => v === '',
          ),
          price: firstWith(
            (i) => i.price,
            (v) => v === null,
          ),
          sizes: firstWith(
            (i) => i.sizes,
            (v) => v.length === 0,
          ),
          colors: firstWith(
            (i) => i.colors,
            (v) => v.length === 0,
          ),
        },
      }),
      this.prisma.dropItem.deleteMany({
        where: { id: { in: rest.map((i) => i.id) } },
      }),
    ]);
    const merged = await this.prisma.dropItem.findUniqueOrThrow({
      where: { id: target.id },
      include: itemInclude,
    });
    return toView(merged);
  }

  // Deletes items and their stored photos. A photo already used by a product
  // (created from the drop but not yet cleaned up) is moved to the gallery
  // instead, so that product never ends up with a broken image.
  async removeItems(
    tenantId: string,
    rawIds: unknown,
  ): Promise<{ removed: number }> {
    const ids = normalizeIds(rawIds);
    return this.remove(tenantId, { id: { in: ids } });
  }

  async clear(tenantId: string): Promise<{ removed: number }> {
    return this.remove(tenantId, {});
  }

  private async remove(
    tenantId: string,
    where: Prisma.DropItemWhereInput,
  ): Promise<{ removed: number }> {
    const items = await this.prisma.dropItem.findMany({
      where: { ...where, tenantId },
      include: itemInclude,
    });
    if (items.length === 0) return { removed: 0 };
    const photos = items.flatMap((i) => i.photos);
    const inUse = await this.prisma.product.findMany({
      where: { tenantId, images: { hasSome: photos.map((p) => p.url) } },
      select: { images: true },
    });
    const usedUrls = new Set(inUse.flatMap((p) => p.images));
    const keep = photos.filter((p) => usedUrls.has(p.url));
    const discard = photos.filter((p) => !usedUrls.has(p.url));

    await this.media.adopt(tenantId, keep.map(storedOf));
    await this.prisma.dropItem.deleteMany({
      where: { id: { in: items.map((i) => i.id) } },
    });
    await this.media.deleteStored(discard);
    return { removed: items.length };
  }

  // ---- Admin only ---------------------------------------------------------

  async adminView(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { photoDropToken: true, photoDropEnabled: true },
    });
    return {
      token: tenant.photoDropToken,
      enabled: tenant.photoDropEnabled,
      items: await this.listItems(tenantId),
    };
  }

  async setEnabled(tenantId: string, enabled: unknown) {
    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('enabled must be true or false');
    }
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { photoDropToken: true },
    });
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        photoDropEnabled: enabled,
        // First time on: mint the link.
        ...(enabled && !tenant.photoDropToken
          ? { photoDropToken: newToken() }
          : {}),
      },
      select: { photoDropToken: true, photoDropEnabled: true },
    });
    return { token: updated.photoDropToken, enabled: updated.photoDropEnabled };
  }

  async regenerate(tenantId: string) {
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { photoDropToken: newToken() },
      select: { photoDropToken: true, photoDropEnabled: true },
    });
    return { token: updated.photoDropToken, enabled: updated.photoDropEnabled };
  }

  // Moves items' photos into the gallery (as-is, no copy) and takes the
  // items out of the drop.
  async toGallery(
    tenantId: string,
    rawIds: unknown,
  ): Promise<{ added: number }> {
    const ids = normalizeIds(rawIds);
    const items = await this.prisma.dropItem.findMany({
      where: { id: { in: ids }, tenantId },
      include: itemInclude,
    });
    const images = items.flatMap((i) =>
      i.photos.map((p) => ({ ...storedOf(p), title: i.title })),
    );
    await this.media.adopt(tenantId, images);
    await this.prisma.dropItem.deleteMany({
      where: { id: { in: items.map((i) => i.id) } },
    });
    return { added: images.length };
  }

  // Creates one product from one or more drop items (the admin may have
  // combined several in the Add several dialog), then moves their photos to
  // the gallery. The product is created first so a validation error leaves
  // the drop untouched.
  async toProduct(
    tenantId: string,
    rawIds: unknown,
    product: Partial<Product>,
  ): Promise<Product> {
    const ids = normalizeIds(rawIds);
    const created = await this.products.create({ ...product, tenantId });
    await this.toGallery(tenantId, ids);
    return created as unknown as Product;
  }
}

function storedOf(p: DropItemWithPhotos['photos'][number]) {
  return {
    key: p.key,
    url: p.url,
    thumbKey: p.thumbKey,
    thumbUrl: p.thumbUrl,
    width: p.width,
    height: p.height,
    bytes: p.bytes,
  };
}
