import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import type { OrderItem, OrderStatus } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Get()
  findAll(@CurrentUser() user: SessionPayload) {
    return this.ordersService.findAll(user.tenantId);
  }

  // Public — the customer-facing tracking page reads by token, no login.
  @Get('track/:token')
  findByTrackingToken(@Param('token') token: string) {
    return this.ordersService.findByTrackingToken(token);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.ordersService.findOne(id, user.tenantId);
  }

  // Public — this is checkout: a guest customer creates their own booking.
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/seen')
  markSeen(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.ordersService.markSeen(id, user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { status: OrderStatus; note?: string },
  ) {
    return this.ordersService.updateStatus(id, user.tenantId, body.status, body.note);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/reopen')
  reopen(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.ordersService.reopen(id, user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/items')
  modifyItems(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { items: OrderItem[]; note?: string },
  ) {
    return this.ordersService.modifyItems(id, user.tenantId, body.items, body.note);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/updates')
  addOrderUpdate(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { note: string },
  ) {
    return this.ordersService.addOrderUpdate(id, user.tenantId, body.note);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/request-balance')
  requestBalance(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.ordersService.requestBalance(id, user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/balance-paid')
  markBalancePaid(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.ordersService.markBalancePaid(id, user.tenantId);
  }
}
