import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
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

  // Public: the web app's proxy calls this to resolve a custom domain to a
  // tenant slug on every request, so it has no auth of its own — it only
  // ever reveals a slug for a domain that's already verified.
  @Get('by-custom-domain/:host')
  getByCustomDomain(@Param('host') host: string) {
    return this.tenantsService.findByCustomDomain(host);
  }

  @Get(':id/domain')
  getDomain(@Param('id') id: string) {
    return this.tenantsService.getDomainStatus(id);
  }

  @Post(':id/domain')
  setDomain(@Param('id') id: string, @Body() body: { domain: string }) {
    return this.tenantsService.setDomain(id, body.domain);
  }

  @Delete(':id/domain')
  removeDomain(@Param('id') id: string) {
    return this.tenantsService.removeDomain(id);
  }

  @Patch(':id/theme')
  updateTheme(@Param('id') id: string, @Body() themeTokens: ThemeTokens) {
    return this.tenantsService.updateTheme(id, themeTokens);
  }

  @Patch(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() body: { whatsappNumber?: string | null },
  ) {
    return this.tenantsService.updateProfile(id, body);
  }
}
