import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  findAll(@Query('tenantId') tenantId: string) {
    return this.mediaService.findAll(tenantId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('tenantId') tenantId: string,
    @Body('altText') altText?: string,
  ) {
    return this.mediaService.upload(tenantId, file, altText);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.mediaService.remove(id, tenantId);
  }
}
