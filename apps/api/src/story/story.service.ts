import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ContentBlock } from '../common/types';

@Injectable()
export class StoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<ContentBlock[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { storyBlocks: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    return tenant.storyBlocks as unknown as ContentBlock[];
  }

  async replaceAll(tenantId: string, blocks: ContentBlock[]): Promise<ContentBlock[]> {
    const stamped = blocks.map((b) => ({ ...b, tenantId }));
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
