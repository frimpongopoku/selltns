import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import type { OrderItem, OrderStatus } from '../common/types';

interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.ordersService.findAll(tenantId);
  }

  @Get('track/:token')
  findByTrackingToken(@Param('token') token: string) {
    return this.ordersService.findByTrackingToken(token);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.ordersService.findOne(id, tenantId);
  }

  @Post()
  create(
    @Body()
    body: {
      tenantId: string;
      customerName: string;
      customerContact: string;
      customerEmail: string;
      whatsappNumber?: string;
      deliveryAddress?: string;
      items: CreateOrderItemInput[];
    },
  ) {
    return this.ordersService.create(body);
  }

  @Patch(':id/seen')
  markSeen(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.ordersService.markSeen(id, body.tenantId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { tenantId: string; status: OrderStatus; note?: string },
  ) {
    return this.ordersService.updateStatus(
      id,
      body.tenantId,
      body.status,
      body.note,
    );
  }

  @Patch(':id/reopen')
  reopen(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.ordersService.reopen(id, body.tenantId);
  }

  @Patch(':id/items')
  modifyItems(
    @Param('id') id: string,
    @Body() body: { tenantId: string; items: OrderItem[]; note?: string },
  ) {
    return this.ordersService.modifyItems(
      id,
      body.tenantId,
      body.items,
      body.note,
    );
  }

  @Patch(':id/updates')
  addOrderUpdate(
    @Param('id') id: string,
    @Body() body: { tenantId: string; note: string },
  ) {
    return this.ordersService.addOrderUpdate(id, body.tenantId, body.note);
  }

  @Patch(':id/request-balance')
  requestBalance(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.ordersService.requestBalance(id, body.tenantId);
  }

  @Patch(':id/balance-paid')
  markBalancePaid(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.ordersService.markBalancePaid(id, body.tenantId);
  }
}
