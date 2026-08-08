import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { StoryService } from './story.service';
import type { ContentBlock } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

@Controller('story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  // Public — the storefront's Story page reads these directly.
  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.storyService.findAll(tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch()
  replaceAll(@CurrentUser() user: SessionPayload, @Body() body: { blocks: ContentBlock[] }) {
    return this.storyService.replaceAll(user.tenantId, body.blocks);
  }
}
