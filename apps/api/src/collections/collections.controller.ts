import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import type { Collection } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  // Public — the storefront reads collections straight from these GETs.
  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('paginate') paginate?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('tag') tag?: string,
  ) {
    if (paginate === 'true') {
      return this.collectionsService.findAllPaginated(tenantId, {
        cursor,
        limit: limit ? Number(limit) : undefined,
        q,
        tag,
      });
    }
    return this.collectionsService.findAll(tenantId);
  }

  // Must come before `:id` or Nest would try to look up a collection with id "tags".
  @Get('tags')
  findDistinctTags(@Query('tenantId') tenantId: string) {
    return this.collectionsService.findDistinctTags(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.collectionsService.findOne(id, tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@CurrentUser() user: SessionPayload, @Body() body: Partial<Collection>) {
    return this.collectionsService.create({ ...body, tenantId: user.tenantId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: Partial<Collection>,
  ) {
    return this.collectionsService.update(id, user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.collectionsService.remove(id, user.tenantId);
  }
}
