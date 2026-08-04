import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
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
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('track/:token')
  findByTrackingToken(@Param('token') token: string) {
    return this.ordersService.findByTrackingToken(token);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      customerName: string;
      customerContact: string;
      items: CreateOrderItemInput[];
    },
  ) {
    return this.ordersService.create(body);
  }

  @Patch(':id/seen')
  markSeen(@Param('id') id: string) {
    return this.ordersService.markSeen(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus; note?: string },
  ) {
    return this.ordersService.updateStatus(id, body.status, body.note);
  }

  @Patch(':id/items')
  modifyItems(
    @Param('id') id: string,
    @Body() body: { items: OrderItem[]; note?: string },
  ) {
    return this.ordersService.modifyItems(id, body.items, body.note);
  }
}
