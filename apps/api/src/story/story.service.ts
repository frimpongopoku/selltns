import { Injectable } from '@nestjs/common';
import { storyBlocks } from '../common/seed-data';
import { ContentBlock } from '../common/types';

@Injectable()
export class StoryService {
  private blocks: ContentBlock[] = [...storyBlocks];

  findAll(tenantId: string): ContentBlock[] {
    return this.blocks.filter((b) => b.tenantId === tenantId);
  }

  replaceAll(tenantId: string, blocks: ContentBlock[]): ContentBlock[] {
    const stamped = blocks.map((b) => ({ ...b, tenantId }));
    this.blocks = [...this.blocks.filter((b) => b.tenantId !== tenantId), ...stamped];
    return stamped;
  }
}
