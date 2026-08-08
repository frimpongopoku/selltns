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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { MAX_UPLOAD_BYTES } from './media.constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: SessionPayload,
    @Body('altText') altText?: string,
    @Body('title') title?: string,
    @Body('tags') tags?: string,
  ) {
    return this.mediaService.upload(user.tenantId, file, { altText, title, tags });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body('title') title?: string | null,
    @Body('tags') tags?: unknown,
  ) {
    return this.mediaService.update(id, user.tenantId, { title, tags });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.mediaService.remove(id, user.tenantId);
  }
}
