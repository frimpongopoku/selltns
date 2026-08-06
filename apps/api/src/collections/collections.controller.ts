import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import type { Collection } from '../common/types';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

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

  @Post()
  create(@Body() body: Partial<Collection> & { tenantId: string }) {
    return this.collectionsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<Collection> & { tenantId: string },
  ) {
    return this.collectionsService.update(id, body.tenantId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.collectionsService.remove(id, tenantId);
  }
}
