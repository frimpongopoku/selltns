import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Order as PrismaOrder,
  Tenant as PrismaTenant,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service';
import {
  newOrderVendorEmail,
  orderCancelledCustomerEmail,
  orderCompletedCustomerEmail,
  orderConfirmedCustomerEmail,
  orderPlacedCustomerEmail,
} from '../email/templates';
import {
  generatePaymentReference,
  generateTrackingToken,
} from './orders.utils';
import type { Order, OrderItem, OrderStatus, Tenant } from '../common/types';

function mapOrder(row: PrismaOrder): Order {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerName: row.customerName,
    customerContact: row.customerContact,
    customerEmail: row.customerEmail,
    status: row.status,
    items: row.items as unknown as OrderItem[],
    total: row.total,
    trackingToken: row.trackingToken,
    paymentReference: row.paymentReference,
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    seenByAdminAt: row.seenByAdminAt?.toISOString() ?? null,
    history: row.history as unknown as Order['history'],
  };
}

function mapTenant(row: PrismaTenant): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    customDomain: row.customDomain,
    domainVerified: row.domainVerified,
    whatsappNumber: row.whatsappNumber,
    themeTokens: row.themeTokens as unknown as Tenant['themeTokens'],
    createdAt: row.createdAt.toISOString(),
  };
}

const UNIQUE_CONSTRAINT_ERROR = 'P2002';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('OrdersService');
  private readonly webOrigin =
    process.env.WEB_ORIGIN ?? 'http://localhost:4310';

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  private async getTenant(tenantId: string): Promise<Tenant> {
    const row = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    return mapTenant(row);
  }

  private async getVendorEmails(tenantId: string): Promise<string[]> {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { tenantId, acceptedAt: { not: null } },
      include: { user: true },
    });
    return memberships.map((m) => m.user.email);
  }

  private urls(tenant: Tenant, order: Order) {
    return {
      trackUrl: `${this.webOrigin}/${tenant.slug}/track/${order.trackingToken}`,
      payUrl: `${this.webOrigin}/${tenant.slug}/pay`,
      adminUrl: `${this.webOrigin}/admin/orders/${order.id}`,
    };
  }

  async findAll(tenantId: string): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapOrder);
  }

  async findOne(id: string, tenantId: string): Promise<Order> {
    const row = await this.prisma.order.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException(`Order ${id} not found`);
    return mapOrder(row);
  }

  async findByTrackingToken(token: string): Promise<Order> {
    const row = await this.prisma.order.findUnique({
      where: { trackingToken: token },
    });
    if (!row) throw new NotFoundException(`Tracking link not found`);
    return mapOrder(row);
  }

  async create(input: {
    tenantId: string;
    customerName: string;
    customerContact: string;
    customerEmail: string;
    items: { productId: string; quantity: number }[];
  }): Promise<Order> {
    const items: OrderItem[] = await Promise.all(
      input.items.map(async ({ productId, quantity }) => {
        const product = await this.productsService.findOne(
          productId,
          input.tenantId,
        );
        return {
          productId: product.id,
          title: product.title,
          quantity,
          priceAtOrder: product.price,
        };
      }),
    );
    const total = items.reduce(
      (sum, item) => sum + item.priceAtOrder * item.quantity,
      0,
    );
    const now = new Date();
    const history = [
      {
        status: 'PENDING' as OrderStatus,
        note: 'Order request submitted by customer',
        at: now.toISOString(),
      },
    ];

    // Collisions are astronomically unlikely (random tokens/refs), but retry
    // a few times against the unique-constraint error rather than trust luck.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const row = await this.prisma.order.create({
          data: {
            tenantId: input.tenantId,
            customerName: input.customerName,
            customerContact: input.customerContact,
            customerEmail: input.customerEmail,
            status: 'PENDING',
            items: items as unknown as Prisma.InputJsonValue,
            total,
            trackingToken: generateTrackingToken(),
            paymentReference: generatePaymentReference(),
            history: history,
          },
        });
        const order = mapOrder(row);
        void this.sendOrderPlacedEmails(order).catch((err) =>
          this.logger.error('Failed to send order-placed emails', err),
        );
        return order;
      } catch (err) {
        const isUniqueConflict =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === UNIQUE_CONSTRAINT_ERROR;
        if (!isUniqueConflict || attempt === 4) throw err;
      }
    }
    throw new Error(
      'Could not generate a unique order reference — please try again.',
    );
  }

  private async sendOrderPlacedEmails(order: Order): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl, adminUrl } = this.urls(tenant, order);
    await this.emailService.send({
      to: order.customerEmail,
      ...orderPlacedCustomerEmail(order, tenant, trackUrl),
    });
    const vendorEmails = await this.getVendorEmails(order.tenantId);
    if (vendorEmails.length > 0) {
      await this.emailService.send({
        to: vendorEmails,
        ...newOrderVendorEmail(order, tenant, adminUrl),
      });
    }
  }

  private async sendOrderConfirmedEmail(order: Order): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl, payUrl } = this.urls(tenant, order);
    await this.emailService.send({
      to: order.customerEmail,
      ...orderConfirmedCustomerEmail(order, tenant, trackUrl, payUrl),
    });
  }

  private async sendOrderCompletedEmail(order: Order): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl } = this.urls(tenant, order);
    await this.emailService.send({
      to: order.customerEmail,
      ...orderCompletedCustomerEmail(order, tenant, trackUrl),
    });
  }

  private async sendOrderCancelledEmail(order: Order): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl } = this.urls(tenant, order);
    await this.emailService.send({
      to: order.customerEmail,
      ...orderCancelledCustomerEmail(order, tenant, trackUrl),
    });
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: OrderStatus,
    note?: string,
  ): Promise<Order> {
    const existing = await this.findOne(id, tenantId);
    const now = new Date();
    const history = [
      ...existing.history,
      {
        status,
        note: note ?? `Status changed to ${status}`,
        at: now.toISOString(),
      },
    ];
    const row = await this.prisma.order.update({
      where: { id: existing.id },
      data: {
        status,
        confirmedAt: status === 'CONFIRMED' ? now : undefined,
        history: history,
      },
    });
    const order = mapOrder(row);
    if (status !== existing.status) {
      if (status === 'CONFIRMED') {
        void this.sendOrderConfirmedEmail(order).catch((err) =>
          this.logger.error('Failed to send order-confirmed email', err),
        );
      } else if (status === 'COMPLETED') {
        void this.sendOrderCompletedEmail(order).catch((err) =>
          this.logger.error('Failed to send order-completed email', err),
        );
      } else if (status === 'CANCELLED') {
        void this.sendOrderCancelledEmail(order).catch((err) =>
          this.logger.error('Failed to send order-cancelled email', err),
        );
      }
    }
    return order;
  }

  async markSeen(id: string, tenantId: string): Promise<Order> {
    const existing = await this.findOne(id, tenantId);
    if (existing.seenByAdminAt) return existing;
    const row = await this.prisma.order.update({
      where: { id: existing.id },
      data: { seenByAdminAt: new Date() },
    });
    return mapOrder(row);
  }

  async modifyItems(
    id: string,
    tenantId: string,
    items: OrderItem[],
    note?: string,
  ): Promise<Order> {
    const existing = await this.findOne(id, tenantId);
    const total = items.reduce(
      (sum, item) => sum + item.priceAtOrder * item.quantity,
      0,
    );
    const now = new Date();
    const history = [
      ...existing.history,
      {
        status: 'MODIFIED' as OrderStatus,
        note: note ?? 'Order modified by admin',
        at: now.toISOString(),
      },
    ];
    const row = await this.prisma.order.update({
      where: { id: existing.id },
      data: {
        items: items as unknown as Prisma.InputJsonValue,
        total,
        status: 'MODIFIED',
        confirmedAt: existing.confirmedAt ? undefined : now,
        history: history,
      },
    });
    const order = mapOrder(row);
    // Modifying items also confirms the order (it unlocks the customer's
    // payment page, same as an explicit "Confirm order"), so it always
    // gets the same confirmed-with-updated-total email.
    void this.sendOrderConfirmedEmail(order).catch((err) =>
      this.logger.error('Failed to send order-confirmed email', err),
    );
    return order;
  }
}
