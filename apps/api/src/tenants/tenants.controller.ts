import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import type { ThemeTokens } from '../common/types';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('by-slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug);
  }

  @Get('check-slug/:slug')
  checkSlug(@Param('slug') slug: string) {
    return this.tenantsService.checkSlugAvailability(slug);
  }

  @Patch(':id/theme')
  updateTheme(@Param('id') id: string, @Body() themeTokens: ThemeTokens) {
    return this.tenantsService.updateTheme(id, themeTokens);
  }
}
