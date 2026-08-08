import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import type { ThemeTokens } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

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

  // Public — feeds the platform's sitemap.ts (apps/web) so tenants without
  // a verified custom domain still get indexed at selltns.com/{slug}.
  @Get('public-directory')
  getPublicDirectory() {
    return this.tenantsService.listPublicDirectory();
  }

  // Public: the web app's proxy calls this to resolve a custom domain to a
  // tenant slug on every request, so it has no auth of its own — it only
  // ever reveals a slug for a domain that's already verified.
  @Get('by-custom-domain/:host')
  getByCustomDomain(@Param('host') host: string) {
    return this.tenantsService.findByCustomDomain(host);
  }

  // These all operate on the caller's own tenant. `:id` stays in the URL to
  // keep the routes RESTful, but must match the authenticated tenant — a
  // mismatch means the caller is trying to touch someone else's store.
  private assertOwnTenant(id: string, user: SessionPayload) {
    if (id !== user.tenantId) {
      throw new ForbiddenException("You don't have access to that store.");
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get(':id/domain')
  getDomain(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    this.assertOwnTenant(id, user);
    return this.tenantsService.getDomainStatus(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post(':id/domain')
  setDomain(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { domain: string },
  ) {
    this.assertOwnTenant(id, user);
    return this.tenantsService.setDomain(id, body.domain);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Delete(':id/domain')
  removeDomain(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    this.assertOwnTenant(id, user);
    return this.tenantsService.removeDomain(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Patch(':id/theme')
  updateTheme(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() themeTokens: ThemeTokens,
  ) {
    this.assertOwnTenant(id, user);
    return this.tenantsService.updateTheme(id, themeTokens);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Patch(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { whatsappNumber?: string | null },
  ) {
    this.assertOwnTenant(id, user);
    return this.tenantsService.updateProfile(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Patch(':id/ownership-info')
  updateOwnershipInfo(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body()
    body: {
      ownerDisplayName?: string;
      ownerTitle?: string;
      ownerBio?: string;
      ownerInfoVisible?: boolean;
    },
  ) {
    this.assertOwnTenant(id, user);
    return this.tenantsService.updateOwnershipInfo(id, body);
  }
}
