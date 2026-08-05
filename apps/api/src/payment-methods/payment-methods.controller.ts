import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import type { PaymentMethod } from '../common/types';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.paymentMethodsService.findAll(tenantId);
  }

  @Post()
  create(@Body() body: Partial<PaymentMethod> & { tenantId: string }) {
    return this.paymentMethodsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<PaymentMethod> & { tenantId: string },
  ) {
    return this.paymentMethodsService.update(id, body.tenantId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.paymentMethodsService.remove(id, tenantId);
  }
}
