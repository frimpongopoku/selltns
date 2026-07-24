import { Body, Controller, Get, Patch } from '@nestjs/common';
import { StoryService } from './story.service';
import type { ContentBlock } from '../common/types';

@Controller('story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get()
  findAll() {
    return this.storyService.findAll();
  }

  @Patch()
  replaceAll(@Body() body: { blocks: ContentBlock[] }) {
    return this.storyService.replaceAll(body.blocks);
  }
}
