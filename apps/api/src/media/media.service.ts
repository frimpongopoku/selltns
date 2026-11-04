import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ImageProcessingService,
  type ProcessedImage,
} from './image-processing.service';
import {
  STORAGE_SERVICE,
  type StorageService,
} from './storage/storage.service';
import {
  ALLOWED_MIME_TYPES,
  MEDIA_PAGE_SIZE,
  MEDIA_PAGE_SIZE_MAX,
} from './media.constants';
import {
  decodeCursor,
  encodeCursor,
  normalizeTags,
  normalizeTitle,
} from './media.utils';
import type { MediaAsset } from '@prisma/client';
import type { ContentBlock } from '../common/types';
import { parseFocus, syncProductImageFocus } from '../common/image-focus';

export interface FindAllParams {
  cursor?: string;
  limit?: number;
  q?: string;
  from?: string;
  to?: string;
}

export interface FindAllResult {
  items: MediaAsset[];
  nextCursor: string | null;
}

// Somewhere a photo is currently shown. Products, collections, the story
// page and the store logo all store the photo's URL rather than its id, so
// usage is found by matching URLs.
export type MediaUsage =
  | { kind: 'product'; id: string; title: string }
  | { kind: 'collection'; id: string; title: string }
  | { kind: 'story' }
  | { kind: 'logo' }
  | { kind: 'drop' };

export interface BulkRemoveResult {
  deleted: string[];
  // Photos left alone because they're still in use somewhere.
  skipped: { id: string; usages: MediaUsage[] }[];
}

const MAX_BULK_IDS = 500;

export interface StoredImage {
  key: string;
  url: string;
  thumbKey: string;
  thumbUrl: string;
  width: number;
  height: number;
  bytes: number;
  focusX: number | null;
  focusY: number | null;
}

// Raw query returns snake_case DB columns — map back to the Prisma shape so
// callers (and the frontend) see one consistent MediaAsset regardless of
// whether it came from findMany or $queryRaw.
interface MediaAssetRow {
  id: string;
  tenant_id: string;
  key: string;
  url: string;
  thumb_key: string;
  thumb_url: string;
  width: number;
  height: number;
  bytes: number;
  title: string | null;
  tags: string[];
  alt_text: string;
  focus_x: number | null;
  focus_y: number | null;
  created_at: Date;
}

function mapRow(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    key: row.key,
    url: row.url,
    thumbKey: row.thumb_key,
    thumbUrl: row.thumb_url,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    title: row.title,
    tags: row.tags,
    altText: row.alt_text,
    focusX: row.focus_x,
    focusY: row.focus_y,
    createdAt: row.created_at,
  };
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imaging: ImageProcessingService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async findAll(
    tenantId: string,
    params: FindAllParams,
  ): Promise<FindAllResult> {
    const limit = Math.min(
      Math.max(params.limit ?? MEDIA_PAGE_SIZE, 1),
      MEDIA_PAGE_SIZE_MAX,
    );
    const cursor = decodeCursor(params.cursor);
    const q = params.q?.trim();
    const from = parseDate(params.from);
    // A bare "YYYY-MM-DD" "to" date should include that whole day, not just
    // its midnight instant.
    const to = parseDate(params.to, { endOfDay: true });

    const searchClause = q
      ? Prisma.sql`AND (title ILIKE ${'%' + q + '%'} OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE ${'%' + q + '%'}))`
      : Prisma.empty;
    const fromClause = from
      ? Prisma.sql`AND created_at >= ${from}`
      : Prisma.empty;
    // Inclusive of the whole "to" day when only a date (no time) is given.
    const toClause = to ? Prisma.sql`AND created_at <= ${to}` : Prisma.empty;
    const cursorClause = cursor
      ? Prisma.sql`AND (created_at, id) < (${cursor.createdAt}, ${cursor.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<MediaAssetRow[]>`
      SELECT id, tenant_id, key, url, thumb_key, thumb_url, width, height, bytes, title, tags, alt_text, focus_x, focus_y, created_at
      FROM media_assets
      WHERE tenant_id = ${tenantId}
      ${searchClause}
      ${fromClause}
      ${toClause}
      ${cursorClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = pageRows.map(mapRow);
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { items, nextCursor };
  }

  async upload(
    tenantId: string,
    file: Express.Multer.File | undefined,
    input: { altText?: string; title?: string; tags?: unknown },
  ): Promise<MediaAsset> {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    const title = normalizeTitle(input.title);
    const tags = normalizeTags(input.tags);

    const id = randomUUID();
    const stored = await this.processAndStore(
      `tenants/${tenantId}/media/${id}`,
      file,
    );

    return this.prisma.mediaAsset.create({
      data: {
        id,
        tenantId,
        ...stored,
        title,
        tags,
        altText: input.altText ?? title ?? '',
      },
    });
  }

  // Validates, resizes and stores an uploaded image under `prefix` without
  // creating a gallery entry — for Photo Drop, whose photos only become
  // MediaAssets later (see adopt()).
  async processAndStore(
    prefix: string,
    file: Express.Multer.File | undefined,
  ): Promise<StoredImage> {
    if (!file) throw new BadRequestException('No file provided');
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        'Unsupported file type — upload a JPEG, PNG, WebP or GIF image.',
      );
    }
    const { display, thumb, focus } = await this.imaging
      .process(file.buffer)
      .catch(() => {
        throw new BadRequestException(
          "Couldn't read that file — is it a valid image?",
        );
      });
    return {
      ...(await this.storeProcessed(prefix, display, thumb)),
      focusX: focus?.x ?? null,
      focusY: focus?.y ?? null,
    };
  }

  // Turns already-stored images into gallery entries, reusing their storage
  // keys (nothing is copied), so URLs already in use stay valid.
  async adopt(
    tenantId: string,
    images: (StoredImage & { title?: string | null })[],
  ): Promise<void> {
    if (images.length === 0) return;
    await this.prisma.mediaAsset.createMany({
      data: images.map(({ title, ...image }) => ({
        tenantId,
        ...image,
        title: title || null,
        altText: title || '',
      })),
    });
  }

  async deleteStored(images: { key: string; thumbKey: string }[]) {
    await Promise.all(
      images.flatMap((i) => [
        this.storage.deleteObject(i.key),
        this.storage.deleteObject(i.thumbKey),
      ]),
    );
  }

  private async storeProcessed(
    prefix: string,
    display: ProcessedImage,
    thumb: ProcessedImage,
  ): Promise<Omit<StoredImage, 'focusX' | 'focusY'>> {
    const key = `${prefix}/original.webp`;
    const thumbKey = `${prefix}/thumb.webp`;
    await Promise.all([
      this.storage.putObject(key, display.buffer, 'image/webp'),
      this.storage.putObject(thumbKey, thumb.buffer, 'image/webp'),
    ]);
    return {
      key,
      url: this.storage.publicUrl(key),
      thumbKey,
      thumbUrl: this.storage.publicUrl(thumbKey),
      width: display.width,
      height: display.height,
      bytes: display.buffer.length,
    };
  }

  async update(
    id: string,
    tenantId: string,
    input: { title?: string | null; tags?: unknown; focus?: unknown },
  ): Promise<MediaAsset> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, tenantId },
    });
    if (!asset) throw new NotFoundException(`Media ${id} not found`);

    const data: Prisma.MediaAssetUpdateInput = {};
    if (input.title !== undefined) data.title = normalizeTitle(input.title);
    if (input.tags !== undefined) data.tags = normalizeTags(input.tags);
    if (input.focus !== undefined) {
      const focus = parseFocus(input.focus);
      data.focusX = focus?.x ?? null;
      data.focusY = focus?.y ?? null;
    }

    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data,
    });
    if (input.focus !== undefined) {
      await this.syncFocusElsewhere(tenantId, [asset]);
    }
    return updated;
  }

  // Sets (or clears, with null) one focus point on many photos at once, and
  // carries it onto the products showing them.
  async setFocus(
    ids: unknown,
    rawFocus: unknown,
    tenantId: string,
  ): Promise<{ updated: number }> {
    const focus = parseFocus(rawFocus);
    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: normalizeIds(ids) }, tenantId },
      select: { id: true, url: true },
    });
    await this.prisma.mediaAsset.updateMany({
      where: { id: { in: assets.map((a) => a.id) } },
      data: { focusX: focus?.x ?? null, focusY: focus?.y ?? null },
    });
    await this.syncFocusElsewhere(tenantId, assets);
    return { updated: assets.length };
  }

  // Carries a photo's focus to the products showing it and to its copies in
  // the Photo Drop (gallery photos sent there for the team).
  private async syncFocusElsewhere(
    tenantId: string,
    assets: { id: string; url: string }[],
  ): Promise<void> {
    const fresh = await this.prisma.mediaAsset.findMany({
      where: { id: { in: assets.map((a) => a.id) }, tenantId },
      select: { id: true, focusX: true, focusY: true },
    });
    for (const a of fresh) {
      await this.prisma.dropPhoto.updateMany({
        where: { mediaAssetId: a.id },
        data: { focusX: a.focusX, focusY: a.focusY },
      });
    }
    await syncProductImageFocus(
      this.prisma,
      tenantId,
      assets.map((a) => a.url),
    );
  }

  // Runs the automatic suggestion on photos already in the gallery (whose
  // focus was never set). The stored files are only read, never changed.
  async suggestFocus(
    ids: unknown,
    tenantId: string,
  ): Promise<{
    updated: { id: string; focusX: number | null; focusY: number | null }[];
  }> {
    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: normalizeIds(ids) }, tenantId },
      select: { id: true, url: true, thumbUrl: true },
    });
    const updated: {
      id: string;
      focusX: number | null;
      focusY: number | null;
    }[] = [];
    for (const asset of assets) {
      const res = await fetch(asset.thumbUrl).catch(() => null);
      if (!res?.ok) continue;
      const focus = await this.imaging
        .suggestFocus(Buffer.from(await res.arrayBuffer()))
        .catch(() => null);
      const row = {
        id: asset.id,
        focusX: focus?.x ?? null,
        focusY: focus?.y ?? null,
      };
      await this.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { focusX: row.focusX, focusY: row.focusY },
      });
      updated.push(row);
    }
    await this.syncFocusElsewhere(tenantId, assets);
    return { updated };
  }

  async remove(id: string, tenantId: string): Promise<{ id: string }> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, tenantId },
    });
    if (!asset) throw new NotFoundException(`Media ${id} not found`);

    const usages = (await this.usagesFor([asset], tenantId))[asset.id];
    if (usages.length > 0) {
      throw new ConflictException(
        "This photo is in use — remove it from wherever it's shown before deleting it.",
      );
    }
    await this.deleteAsset(asset);
    return { id: asset.id };
  }

  async findUsages(
    ids: unknown,
    tenantId: string,
  ): Promise<Record<string, MediaUsage[]>> {
    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: normalizeIds(ids) }, tenantId },
    });
    return this.usagesFor(assets, tenantId);
  }

  // Deletes only the photos nobody is using — in-use ones are skipped and
  // reported back so the vendor can remove them from wherever they're shown
  // first. Enforced here rather than trusted from the client.
  async bulkRemove(ids: unknown, tenantId: string): Promise<BulkRemoveResult> {
    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: normalizeIds(ids) }, tenantId },
    });
    const usages = await this.usagesFor(assets, tenantId);

    const deleted: string[] = [];
    const skipped: BulkRemoveResult['skipped'] = [];
    for (const asset of assets) {
      if (usages[asset.id].length > 0) {
        skipped.push({ id: asset.id, usages: usages[asset.id] });
        continue;
      }
      await this.deleteAsset(asset);
      deleted.push(asset.id);
    }
    return { deleted, skipped };
  }

  private async deleteAsset(asset: MediaAsset): Promise<void> {
    await Promise.all([
      this.storage.deleteObject(asset.key),
      this.storage.deleteObject(asset.thumbKey),
    ]);
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
  }

  private async usagesFor(
    assets: MediaAsset[],
    tenantId: string,
  ): Promise<Record<string, MediaUsage[]>> {
    const result: Record<string, MediaUsage[]> = {};
    if (assets.length === 0) return result;

    const urls = assets.flatMap((a) => [a.url, a.thumbUrl]);
    const [products, collections, tenant, dropPhotos] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, images: { hasSome: urls } },
        select: { id: true, title: true, images: true },
      }),
      this.prisma.collection.findMany({
        where: {
          tenantId,
          OR: [{ coverImage: { in: urls } }, { unfurlImage: { in: urls } }],
        },
        select: { id: true, title: true, coverImage: true, unfurlImage: true },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { logoUrl: true, storyBlocks: true },
      }),
      // Gallery photos the admin handed to the team via Photo Drop.
      this.prisma.dropPhoto.findMany({
        where: { mediaAssetId: { in: assets.map((a) => a.id) } },
        select: { mediaAssetId: true },
      }),
    ]);
    const inDrop = new Set(dropPhotos.map((p) => p.mediaAssetId));
    const storyUrls = new Set(
      ((tenant?.storyBlocks ?? []) as unknown as ContentBlock[]).flatMap(
        (b) => b.imageUrls ?? [],
      ),
    );

    for (const asset of assets) {
      const matches = (url: string | null | undefined) =>
        url === asset.url || url === asset.thumbUrl;
      const usages: MediaUsage[] = [];
      for (const p of products) {
        if (p.images.some(matches)) {
          usages.push({ kind: 'product', id: p.id, title: p.title });
        }
      }
      for (const c of collections) {
        if (matches(c.coverImage) || matches(c.unfurlImage)) {
          usages.push({ kind: 'collection', id: c.id, title: c.title });
        }
      }
      if (storyUrls.has(asset.url) || storyUrls.has(asset.thumbUrl)) {
        usages.push({ kind: 'story' });
      }
      if (matches(tenant?.logoUrl)) usages.push({ kind: 'logo' });
      if (inDrop.has(asset.id)) usages.push({ kind: 'drop' });
      result[asset.id] = usages;
    }
    return result;
  }
}

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw))
    throw new BadRequestException('ids must be an array');
  const ids = [
    ...new Set(raw.filter((v): v is string => typeof v === 'string')),
  ];
  if (ids.length > MAX_BULK_IDS) {
    throw new BadRequestException(`At most ${MAX_BULK_IDS} photos at a time`);
  }
  return ids;
}

function parseDate(
  raw: string | undefined,
  options?: { endOfDay?: boolean },
): Date | null {
  if (!raw) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const date = new Date(
    isDateOnly && options?.endOfDay ? `${raw}T23:59:59.999` : raw,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}
