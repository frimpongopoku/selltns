import { Injectable } from '@nestjs/common';
import { storyBlocks } from '../common/seed-data';
import { ContentBlock } from '../common/types';

@Injectable()
export class StoryService {
  private blocks: ContentBlock[] = [...storyBlocks];

  findAll(): ContentBlock[] {
    return this.blocks;
  }

  replaceAll(blocks: ContentBlock[]): ContentBlock[] {
    this.blocks = blocks;
    return this.blocks;
  }
}
