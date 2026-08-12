import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { PlanTier, UpgradeRequestStatus } from '@prisma/client';
import { BillingService } from './billing.service';
import { SuperAdminGuard } from '../superadmin/superadmin-session.guard';
import { CurrentSuperAdmin } from '../superadmin/current-superadmin.decorator';
import type { SuperAdminSessionPayload } from '../superadmin/superadmin-session.guard';

const PLAN_TIERS: PlanTier[] = ['FREE', 'GROWTH', 'PRO'];
const REQUEST_STATUSES: UpgradeRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

// SuperAdmin-facing — configuring what vendors see on the Upgrade page, and
// reviewing/approving their upgrade requests.
@Controller('superadmin/billing')
@UseGuards(SuperAdminGuard)
export class SuperAdminBillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('payment-methods')
  listPaymentMethods() {
    return this.billingService.listPlatformPaymentMethods(false);
  }

  @Post('payment-methods')
  createPaymentMethod(
    @Body()
    body: {
      type?: 'MOMO' | 'BANK';
      label?: string;
      details?: Record<string, string>;
      isEnabled?: boolean;
    },
  ) {
    if (body.type !== 'MOMO' && body.type !== 'BANK') {
      throw new BadRequestException('type must be MOMO or BANK');
    }
    if (!body.label?.trim()) {
      throw new BadRequestException('A label is required.');
    }
    return this.billingService.createPlatformPaymentMethod({
      type: body.type,
      label: body.label.trim(),
      details: body.details ?? {},
      isEnabled: body.isEnabled,
    });
  }

  @Patch('payment-methods/:id')
  updatePaymentMethod(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      type: 'MOMO' | 'BANK';
      label: string;
      details: Record<string, string>;
      isEnabled: boolean;
      isPreferred: boolean;
    }>,
  ) {
    return this.billingService.updatePlatformPaymentMethod(id, body);
  }

  @Delete('payment-methods/:id')
  removePaymentMethod(@Param('id') id: string) {
    return this.billingService.removePlatformPaymentMethod(id);
  }

  @Get('message')
  getMessage() {
    return this.billingService.getBillingMessage();
  }

  @Post('message')
  setMessage(@Body('message') message: string) {
    return this.billingService.setBillingMessage(message ?? '');
  }

  @Get('requests')
  listRequests(@Query('status') status?: string) {
    if (status && !REQUEST_STATUSES.includes(status as UpgradeRequestStatus)) {
      throw new BadRequestException('Invalid status filter');
    }
    return this.billingService.listUpgradeRequests(
      status as UpgradeRequestStatus | undefined,
    );
  }

  @Get('requests/:id')
  getRequest(@Param('id') id: string) {
    return this.billingService.getUpgradeRequest(id);
  }

  @Post('requests/:id/approve')
  approveRequest(
    @Param('id') id: string,
    @CurrentSuperAdmin() superAdmin: SuperAdminSessionPayload,
  ) {
    return this.billingService.approveUpgradeRequest(id, superAdmin.sub);
  }

  @Post('requests/:id/reject')
  rejectRequest(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentSuperAdmin() superAdmin: SuperAdminSessionPayload,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('A rejection reason is required.');
    }
    return this.billingService.rejectUpgradeRequest(
      id,
      reason.trim(),
      superAdmin.sub,
    );
  }

  // Direct override, no request required — for a purely WhatsApp-and-MoMo
  // arrangement that never went through the self-serve form.
  @Post('tenants/:tenantId/plan')
  setTenantPlan(
    @Param('tenantId') tenantId: string,
    @Body('plan') plan: string,
  ) {
    if (!PLAN_TIERS.includes(plan as PlanTier)) {
      throw new BadRequestException('plan must be FREE, GROWTH, or PRO');
    }
    return this.billingService.setTenantPlan(tenantId, plan as PlanTier);
  }
}
