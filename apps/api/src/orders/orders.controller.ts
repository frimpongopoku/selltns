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
import { Throttle } from '@nestjs/throttler';
import { OrdersService, type ManualOrderInput } from './orders.service';
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderSource,
} from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  size?: string | null;
  color?: string | null;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private async withImages<T extends Order | Order[]>(
    result: Promise<T>,
  ): Promise<T> {
    return this.ordersService.withItemImages(await result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Get()
  findAll(
    @CurrentUser() user: SessionPayload,
    @Query('source') source?: OrderSource,
  ) {
    return this.withImages(this.ordersService.findAll(user.tenantId, source));
  }

  // Public — the customer-facing tracking page reads by token, no login.
  @Get('track/:token')
  findByTrackingToken(@Param('token') token: string) {
    return this.withImages(this.ordersService.findByTrackingToken(token));
  }

  // Public — anyone with the tracking link can view the order, but cancelling
  // it also requires the payment reference emailed to the customer, so a
  // forwarded/leaked link alone isn't enough to cancel someone else's order.
  @Patch('track/:token/cancel')
  cancelByToken(
    @Param('token') token: string,
    @Body() body: { paymentReference: string },
  ) {
    return this.withImages(
      this.ordersService.cancelByToken(token, body.paymentReference),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.withImages(this.ordersService.findOne(id, user.tenantId));
  }

  // Public — this is checkout: a guest customer creates their own booking.
  // Tightened against bots flooding a vendor with fake orders.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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
    return this.withImages(this.ordersService.create(body));
  }

  // An order the vendor took outside the storefront (in person, by phone,
  // in DMs) — recorded so it counts toward their sales and stock.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Post('manual')
  createManual(
    @CurrentUser() user: SessionPayload,
    @Body() body: ManualOrderInput,
  ) {
    return this.withImages(
      this.ordersService.createManual(user.tenantId, body),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/seen')
  markSeen(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.withImages(this.ordersService.markSeen(id, user.tenantId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { status: OrderStatus; note?: string },
  ) {
    return this.withImages(
      this.ordersService.updateStatus(
        id,
        user.tenantId,
        body.status,
        body.note,
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/reopen')
  reopen(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.withImages(this.ordersService.reopen(id, user.tenantId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/items')
  modifyItems(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { items: OrderItem[]; note?: string },
  ) {
    return this.withImages(
      this.ordersService.modifyItems(
        id,
        user.tenantId,
        // image/imageFocus are read-time only — never store them.
        body.items.map((item) => ({
          productId: item.productId,
          title: item.title,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder,
          size: item.size,
          color: item.color,
        })),
        body.note,
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/updates')
  addOrderUpdate(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body() body: { note: string },
  ) {
    return this.withImages(
      this.ordersService.addOrderUpdate(id, user.tenantId, body.note),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/request-balance')
  requestBalance(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.withImages(
      this.ordersService.requestBalance(id, user.tenantId),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @Patch(':id/balance-paid')
  markBalancePaid(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
  ) {
    return this.withImages(
      this.ordersService.markBalancePaid(id, user.tenantId),
    );
  }
}
