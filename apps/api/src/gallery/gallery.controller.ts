import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { MediaAsset } from '../common/types';

@Controller('media')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.galleryService.findAll(tenantId);
  }

  @Post()
  create(@Body() body: Partial<MediaAsset> & { tenantId: string }) {
    return this.galleryService.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.galleryService.remove(id, tenantId);
  }
}
