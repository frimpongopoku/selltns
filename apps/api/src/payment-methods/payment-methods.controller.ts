import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import type { PaymentMethod } from '../common/types';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  findAll() {
    return this.paymentMethodsService.findAll();
  }

  @Post()
  create(@Body() body: Partial<PaymentMethod>) {
    return this.paymentMethodsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<PaymentMethod>) {
    return this.paymentMethodsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentMethodsService.remove(id);
  }
}
