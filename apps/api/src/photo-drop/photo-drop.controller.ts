import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { PhotoDropService, type DropItemInput } from './photo-drop.service';
import { MAX_UPLOAD_BYTES } from '../media/media.constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';
import type { Product } from '../common/types';

@Controller('photo-drop')
export class PhotoDropController {
  constructor(private readonly photoDrop: PhotoDropService) {}

  // ---- Public: the team link. No login — the unguessable token in the URL
  // is the only key, and the vendor can switch it off or replace it.

  @Get('public/:token')
  publicView(@Param('token') token: string) {
    return this.photoDrop.publicView(token);
  }

  // A shoot can mean dozens of photos in a minute, but not thousands.
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('public/:token/photos')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const tenantId = await this.photoDrop.resolveToken(token);
    return this.photoDrop.upload(tenantId, file);
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('public/:token/items/:id/photos')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async addPhoto(
    @Param('token') token: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const tenantId = await this.photoDrop.resolveToken(token);
    return this.photoDrop.addPhoto(tenantId, id, file);
  }

  @Post('public/:token/items/:id/photos/:photoId/delete')
  async removePhoto(
    @Param('token') token: string,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    const tenantId = await this.photoDrop.resolveToken(token);
    return this.photoDrop.removePhoto(tenantId, id, photoId);
  }

  @Patch('public/:token/items/:id')
  async publicUpdate(
    @Param('token') token: string,
    @Param('id') id: string,
    @Body() body: DropItemInput,
  ) {
    const tenantId = await this.photoDrop.resolveToken(token);
    return this.photoDrop.updateItem(tenantId, id, body);
  }

  @Post('public/:token/items/group')
  async publicGroup(@Param('token') token: string, @Body('ids') ids: unknown) {
    const tenantId = await this.photoDrop.resolveToken(token);
    return this.photoDrop.group(tenantId, ids);
  }

  @Post('public/:token/items/unavailable')
  async publicUnavailable(
    @Param('token') token: string,
    @Body('ids') ids: unknown,
    @Body('unavailable') unavailable: unknown,
  ) {
    const tenantId = await this.photoDrop.resolveToken(token);
    return this.photoDrop.setUnavailable(tenantId, ids, unavailable);
  }

  @Post('public/:token/items/delete')
  async publicRemove(@Param('token') token: string, @Body('ids') ids: unknown) {
    const tenantId = await this.photoDrop.resolveToken(token);
    return this.photoDrop.removeItems(tenantId, ids);
  }

  // ---- Admin: review the drop and send items on.

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get()
  adminView(@CurrentUser() user: SessionPayload) {
    return this.photoDrop.adminView(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch('link')
  setEnabled(
    @CurrentUser() user: SessionPayload,
    @Body('enabled') enabled: unknown,
  ) {
    return this.photoDrop.setEnabled(user.tenantId, enabled);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('link/regenerate')
  regenerate(@CurrentUser() user: SessionPayload) {
    return this.photoDrop.regenerate(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch('items/:id')
  update(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Body() body: DropItemInput,
  ) {
    return this.photoDrop.updateItem(user.tenantId, id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('items/delete')
  remove(@CurrentUser() user: SessionPayload, @Body('ids') ids: unknown) {
    return this.photoDrop.removeItems(user.tenantId, ids);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('items/clear')
  clear(@CurrentUser() user: SessionPayload) {
    return this.photoDrop.clear(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('items/from-gallery')
  fromGallery(
    @CurrentUser() user: SessionPayload,
    @Body('ids') ids: unknown,
    @Body('asOne') asOne: unknown,
  ) {
    return this.photoDrop.fromGallery(user.tenantId, ids, asOne);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('items/to-gallery')
  toGallery(@CurrentUser() user: SessionPayload, @Body('ids') ids: unknown) {
    return this.photoDrop.toGallery(user.tenantId, ids);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('items/to-product')
  toProduct(
    @CurrentUser() user: SessionPayload,
    @Body('ids') ids: unknown,
    @Body('product') product: Partial<Product>,
  ) {
    return this.photoDrop.toProduct(user.tenantId, ids, product ?? {});
  }
}
