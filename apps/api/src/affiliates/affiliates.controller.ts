import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import type { AffiliateCapType } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

// Every mutating/reading action here is scoped to the caller's own tenant,
// on whichever side of the relationship they're acting from — the service
// re-checks which side the caller is actually on, since the same :id route
// is shared by both the owner and the affiliate. Guards are per-method
// (not class-level) because public-summary is a public, unauthenticated
// read used by every storefront footer.
@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  // Public — feeds SiteFooter with this tenant's own affiliate
  // relationships (both directions), gated by the tenant's own disclosure
  // setting server-side.
  @Get('public-summary/:tenantId')
  getPublicSummary(@Param('tenantId') tenantId: string) {
    return this.affiliatesService.getPublicSummary(tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post('invite')
  invite(
    @CurrentUser() user: SessionPayload,
    @Body()
    body: {
      affiliateSlug: string;
      capType: AffiliateCapType;
      capValue: number;
    },
  ) {
    return this.affiliatesService.invite(user.tenantId, user.sub, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get('outgoing')
  findOutgoing(@CurrentUser() user: SessionPayload) {
    return this.affiliatesService.findOutgoing(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get('incoming')
  findIncoming(@CurrentUser() user: SessionPayload) {
    return this.affiliatesService.findIncoming(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Patch(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.affiliatesService.accept(id, user.tenantId, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Patch(':id/decline')
  decline(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.affiliatesService.decline(id, user.tenantId, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Patch(':id/terminate')
  terminate(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.affiliatesService.terminate(id, user.tenantId, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get(':id/eligible-products')
  eligibleProducts(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
  ) {
    return this.affiliatesService.eligibleProducts(id, user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post(':id/exemptions/:productId')
  exempt(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser() user: SessionPayload,
  ) {
    return this.affiliatesService.exempt(id, user.tenantId, productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Delete(':id/exemptions/:productId')
  unexempt(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser() user: SessionPayload,
  ) {
    return this.affiliatesService.unexempt(id, user.tenantId, productId);
  }

  // The product-editing-pane version of exemptions above — one product,
  // every affiliate at once. Routed here (not under /products) since it's
  // still fundamentally affiliate-relationship data.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get('products/:productId/visibility')
  getProductVisibility(
    @Param('productId') productId: string,
    @CurrentUser() user: SessionPayload,
  ) {
    return this.affiliatesService.getProductVisibility(
      productId,
      user.tenantId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch('products/:productId/visibility')
  setProductVisibility(
    @Param('productId') productId: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { hiddenFromAll: boolean; exemptRelationshipIds: string[] },
  ) {
    return this.affiliatesService.setProductVisibility(
      productId,
      user.tenantId,
      body,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get(':id/listings')
  listings(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.affiliatesService.listings(id, user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch(':id/listings/:productId')
  setPrice(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { price: number },
  ) {
    return this.affiliatesService.setPrice(
      id,
      user.tenantId,
      productId,
      body.price,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch(':id/listings/:productId/toggle')
  toggleListing(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { isActive: boolean },
  ) {
    return this.affiliatesService.toggleListing(
      id,
      user.tenantId,
      productId,
      body.isActive,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post(':id/collections/:collectionId/items/:productId')
  addCollectionItem(
    @Param('id') id: string,
    @Param('collectionId') collectionId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: SessionPayload,
  ) {
    return this.affiliatesService.addCollectionItem(
      id,
      user.tenantId,
      collectionId,
      productId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Delete(':id/collections/:collectionId/items/:productId')
  removeCollectionItem(
    @Param('id') id: string,
    @Param('collectionId') collectionId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: SessionPayload,
  ) {
    return this.affiliatesService.removeCollectionItem(
      id,
      user.tenantId,
      collectionId,
      productId,
    );
  }
}
