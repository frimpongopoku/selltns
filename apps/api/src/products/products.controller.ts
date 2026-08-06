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
import { ProductsService } from './products.service';
import type { Product } from '../common/types';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('paginate') paginate?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('tag') tag?: string,
  ) {
    if (paginate === 'true') {
      return this.productsService.findAllPaginated(tenantId, {
        cursor,
        limit: limit ? Number(limit) : undefined,
        q,
        status,
        tag,
      });
    }
    return this.productsService.findAll(tenantId);
  }

  // Must come before `:id` or Nest would try to look up a product with id "tags".
  @Get('tags')
  findDistinctTags(@Query('tenantId') tenantId: string) {
    return this.productsService.findDistinctTags(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.productsService.findOne(id, tenantId);
  }

  @Post()
  create(@Body() body: Partial<Product> & { tenantId: string }) {
    return this.productsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<Product> & { tenantId: string },
  ) {
    return this.productsService.update(id, body.tenantId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.productsService.remove(id, tenantId);
  }
}
