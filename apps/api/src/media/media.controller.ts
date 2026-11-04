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
    return this.mediaService.upload(user.tenantId, file, {
      altText,
      title,
      tags,
    });
  }

  // POST (not GET) so a large selection of ids fits in the body. Declared
  // before the ':id' routes so "usage"/"bulk-delete" aren't read as ids.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('usage')
  findUsages(@CurrentUser() user: SessionPayload, @Body('ids') ids: unknown) {
    return this.mediaService.findUsages(ids, user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('bulk-delete')
  bulkRemove(@CurrentUser() user: SessionPayload, @Body('ids') ids: unknown) {
    return this.mediaService.bulkRemove(ids, user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('focus')
  setFocus(
    @CurrentUser() user: SessionPayload,
    @Body('ids') ids: unknown,
    @Body('focus') focus: unknown,
  ) {
    return this.mediaService.setFocus(ids, focus, user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post('focus/suggest')
  suggestFocus(@CurrentUser() user: SessionPayload, @Body('ids') ids: unknown) {
    return this.mediaService.suggestFocus(ids, user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body('title') title?: string | null,
    @Body('tags') tags?: unknown,
    @Body('focus') focus?: unknown,
  ) {
    return this.mediaService.update(id, user.tenantId, { title, tags, focus });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.mediaService.remove(id, user.tenantId);
  }
}
