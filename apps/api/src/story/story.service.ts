import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ContentBlock } from '../common/types';
import { imageFocusFor } from '../common/image-focus';

@Injectable()
export class StoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<ContentBlock[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { storyBlocks: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    const blocks = tenant.storyBlocks as unknown as ContentBlock[];
    // Each photo's gallery focus point, looked up on read so it's never stale.
    const imageFocus = await imageFocusFor(
      this.prisma,
      tenantId,
      blocks.flatMap((b) => b.imageUrls ?? []),
    );
    return blocks.map((b) =>
      b.imageUrls?.length
        ? {
            ...b,
            imageFocus: Object.fromEntries(
              b.imageUrls
                .filter((url) => imageFocus[url])
                .map((url) => [url, imageFocus[url]]),
            ),
          }
        : b,
    );
  }

  async replaceAll(tenantId: string, blocks: ContentBlock[]): Promise<ContentBlock[]> {
    // imageFocus is read-only (see findAll) — never stored with the block.
    const stamped = blocks.map((b) => {
      const block = { ...b, tenantId };
      delete block.imageFocus;
      return block;
    });
    await this.prisma.tenant
      .update({
        where: { id: tenantId },
        data: { storyBlocks: stamped as object },
      })
      .catch(() => {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      });
    return stamped;
  }
}
