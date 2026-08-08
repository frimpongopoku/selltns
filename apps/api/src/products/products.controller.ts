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
import { ProductsService } from './products.service';
import type { Product } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Public — the storefront reads products straight from these GETs.
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Post()
  create(@CurrentUser() user: SessionPayload, @Body() body: Partial<Product>) {
    return this.productsService.create({ ...body, tenantId: user.tenantId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: Partial<Product>,
  ) {
    return this.productsService.update(id, user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.productsService.remove(id, user.tenantId);
  }
}
