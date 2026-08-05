import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { MAX_UPLOAD_BYTES } from './media.constants';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.mediaService.findAll(tenantId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
      q,
      from,
      to,
    });
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('tenantId') tenantId: string,
    @Body('altText') altText?: string,
    @Body('title') title?: string,
    @Body('tags') tags?: string,
  ) {
    return this.mediaService.upload(tenantId, file, { altText, title, tags });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body('tenantId') tenantId: string,
    @Body('title') title?: string | null,
    @Body('tags') tags?: unknown,
  ) {
    return this.mediaService.update(id, tenantId, { title, tags });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.mediaService.remove(id, tenantId);
  }
}
