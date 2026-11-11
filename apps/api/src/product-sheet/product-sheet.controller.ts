import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProductSheetService } from './product-sheet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

@Controller('product-sheet')
export class ProductSheetController {
  constructor(private readonly sheet: ProductSheetService) {}

  // ---- Public: the team link. No login — the unguessable token in the URL
  // is the only key, and the vendor can switch it off or replace it.

  @Get('public/:token')
  publicView(@Param('token') token: string) {
    return this.sheet.publicView(token);
  }

  @Get('public/:token/products')
  products(
    @Param('token') token: string,
    @Query('cursor') cursor?: string,
    @Query('q') q?: string,
  ) {
    return this.sheet.listProducts(token, { cursor, q });
  }

  @Get('public/:token/gallery')
  gallery(
    @Param('token') token: string,
    @Query('cursor') cursor?: string,
    @Query('q') q?: string,
  ) {
    return this.sheet.gallery(token, { cursor, q });
  }

  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  @Put('public/:token/products/:id')
  saveEdit(
    @Param('token') token: string,
    @Param('id') id: string,
    @Body('changes') changes: unknown,
    @Body('author') author: unknown,
  ) {
    return this.sheet.saveEdit(token, id, changes, author);
  }

  @Post('public/:token/products/:id/undo')
  async undoEdit(@Param('token') token: string, @Param('id') id: string) {
    await this.sheet.undoEdit(token, id);
    return { ok: true };
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('public/:token/new')
  createNew(
    @Param('token') token: string,
    @Body('changes') changes: unknown,
    @Body('author') author: unknown,
  ) {
    return this.sheet.saveNew(token, null, changes, author);
  }

  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  @Put('public/:token/new/:id')
  updateNew(
    @Param('token') token: string,
    @Param('id') id: string,
    @Body('changes') changes: unknown,
    @Body('author') author: unknown,
  ) {
    return this.sheet.saveNew(token, id, changes, author);
  }

  @Post('public/:token/new/:id/delete')
  async removeNew(@Param('token') token: string, @Param('id') id: string) {
    await this.sheet.removeNew(token, id);
    return { ok: true };
  }

  // ---- Admin: set up the link and review what the team suggested.

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get()
  adminView(@CurrentUser() user: SessionPayload) {
    return this.sheet.adminView(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get('scope-products')
  scopeProducts(@CurrentUser() user: SessionPayload) {
    return this.sheet.scopeProducts(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get('pending-count')
  pendingCount(@CurrentUser() user: SessionPayload) {
    return this.sheet.pendingCount(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch('link')
  setEnabled(
    @CurrentUser() user: SessionPayload,
    @Body('enabled') enabled: unknown,
  ) {
    return this.sheet.setEnabled(user.tenantId, enabled);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('link/regenerate')
  regenerate(@CurrentUser() user: SessionPayload) {
    return this.sheet.regenerate(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Put('scope')
  setScope(
    @CurrentUser() user: SessionPayload,
    @Body('allProducts') allProducts: unknown,
    @Body('productIds') productIds: unknown,
  ) {
    return this.sheet.setScope(user.tenantId, allProducts, productIds);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('publish')
  publish(@CurrentUser() user: SessionPayload, @Body('ids') ids: unknown) {
    return this.sheet.publish(user.tenantId, ids);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('discard')
  discard(@CurrentUser() user: SessionPayload, @Body('ids') ids: unknown) {
    return this.sheet.discard(user.tenantId, ids);
  }
}
