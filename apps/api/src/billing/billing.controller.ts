import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { PlanTier } from '@prisma/client';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

const REQUESTABLE_PLANS: PlanTier[] = ['GROWTH', 'PRO'];

// Tenant-facing — what a vendor sees on their own Upgrade page: Selltns'
// payment details, the instructions message, and their own request history.
@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('payment-methods')
  listPaymentMethods() {
    return this.billingService.listPlatformPaymentMethods(true);
  }

  @Get('message')
  getMessage() {
    return this.billingService.getBillingMessage();
  }

  @Get('requests')
  @Roles('OWNER', 'MANAGER')
  listOwnRequests(@CurrentUser() user: SessionPayload) {
    return this.billingService.listOwnUpgradeRequests(user.tenantId);
  }

  @Post('requests')
  @Roles('OWNER', 'MANAGER')
  submitRequest(
    @CurrentUser() user: SessionPayload,
    @Body() body: { requestedPlan?: string; referenceNote?: string },
  ) {
    if (!REQUESTABLE_PLANS.includes(body.requestedPlan as PlanTier)) {
      throw new BadRequestException('requestedPlan must be GROWTH or PRO');
    }
    if (!body.referenceNote?.trim()) {
      throw new BadRequestException(
        'Add the payment reference or a note so we can match it to your payment.',
      );
    }
    return this.billingService.submitUpgradeRequest(
      user.tenantId,
      body.requestedPlan as PlanTier,
      body.referenceNote.trim(),
    );
  }
}
