import {
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
import { PaymentMethodsService } from './payment-methods.service';
import type { PaymentMethod } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  // Public — the pay page shows enabled payment methods to customers.
  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.paymentMethodsService.findAll(tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@CurrentUser() user: SessionPayload, @Body() body: Partial<PaymentMethod>) {
    return this.paymentMethodsService.create({ ...body, tenantId: user.tenantId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: Partial<PaymentMethod>,
  ) {
    return this.paymentMethodsService.update(id, user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.paymentMethodsService.remove(id, user.tenantId);
  }
}
