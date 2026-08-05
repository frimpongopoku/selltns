import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { StoryService } from './story.service';
import type { ContentBlock } from '../common/types';

@Controller('story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.storyService.findAll(tenantId);
  }

  @Patch()
  replaceAll(@Body() body: { tenantId: string; blocks: ContentBlock[] }) {
    return this.storyService.replaceAll(body.tenantId, body.blocks);
  }
}
