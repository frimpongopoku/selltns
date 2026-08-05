import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImageProcessingService } from './image-processing.service';
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
      SELECT id, tenant_id, key, url, thumb_key, thumb_url, width, height, bytes, title, tags, alt_text, created_at
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

    const title = normalizeTitle(input.title);
    const tags = normalizeTags(input.tags);

    const { display, thumb } = await this.imaging
      .process(file.buffer)
      .catch(() => {
        throw new BadRequestException(
          "Couldn't read that file — is it a valid image?",
        );
      });

    const id = randomUUID();
    const key = `tenants/${tenantId}/media/${id}/original.webp`;
    const thumbKey = `tenants/${tenantId}/media/${id}/thumb.webp`;

    await Promise.all([
      this.storage.putObject(key, display.buffer, 'image/webp'),
      this.storage.putObject(thumbKey, thumb.buffer, 'image/webp'),
    ]);

    return this.prisma.mediaAsset.create({
      data: {
        id,
        tenantId,
        key,
        url: this.storage.publicUrl(key),
        thumbKey,
        thumbUrl: this.storage.publicUrl(thumbKey),
        width: display.width,
        height: display.height,
        bytes: display.buffer.length,
        title,
        tags,
        altText: input.altText ?? title ?? '',
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    input: { title?: string | null; tags?: unknown },
  ): Promise<MediaAsset> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, tenantId },
    });
    if (!asset) throw new NotFoundException(`Media ${id} not found`);

    const data: Prisma.MediaAssetUpdateInput = {};
    if (input.title !== undefined) data.title = normalizeTitle(input.title);
    if (input.tags !== undefined) data.tags = normalizeTags(input.tags);

    return this.prisma.mediaAsset.update({ where: { id }, data });
  }

  async remove(id: string, tenantId: string): Promise<{ id: string }> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, tenantId },
    });
    if (!asset) throw new NotFoundException(`Media ${id} not found`);

    await Promise.all([
      this.storage.deleteObject(asset.key),
      this.storage.deleteObject(asset.thumbKey),
    ]);
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
    return { id: asset.id };
  }
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
