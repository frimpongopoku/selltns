import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
  preorderBalanceDueEmail,
  preorderUpdateEmail,
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
    completedAt: row.completedAt?.toISOString() ?? null,
    seenByAdminAt: row.seenByAdminAt?.toISOString() ?? null,
    history: row.history as unknown as Order['history'],
    type: row.type,
    depositType: row.depositType,
    depositPercentage: row.depositPercentage,
    depositAmount: row.depositAmount,
    balanceAmount: row.balanceAmount,
    balancePaid: row.balancePaid,
    balancePaidAt: row.balancePaidAt?.toISOString() ?? null,
    balanceRequestedAt: row.balanceRequestedAt?.toISOString() ?? null,
    whatsappNumber: row.whatsappNumber,
    deliveryAddress: row.deliveryAddress,
    preorderCollectionId: row.preorderCollectionId,
  };
}

// A completed order can be reopened by the vendor to fix a mistake, but only
// for a short window — otherwise a customer could see their "done" order
// silently flip back to in-progress days or weeks later.
const COMPLETION_REVERSAL_WINDOW_MS = 48 * 60 * 60 * 1000;

function mapTenant(row: PrismaTenant): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    customDomain: row.customDomain,
    domainVerified: row.domainVerified,
    whatsappNumber: row.whatsappNumber,
    ownerDisplayName: row.ownerDisplayName,
    ownerTitle: row.ownerTitle,
    ownerBio: row.ownerBio,
    ownerInfoVisible: row.ownerInfoVisible,
    heroTagline: row.heroTagline,
    footerTagline: row.footerTagline,
    themeTokens: row.themeTokens as unknown as Tenant['themeTokens'],
    createdAt: row.createdAt.toISOString(),
    verificationStatus: row.verificationStatus,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    suspended: row.suspended,
    suspendedAt: row.suspendedAt?.toISOString() ?? null,
    suspendedReason: row.suspendedReason,
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
    whatsappNumber?: string;
    deliveryAddress?: string;
    items: { productId: string; quantity: number }[];
  }): Promise<Order> {
    const products = await Promise.all(
      input.items.map(({ productId }) =>
        this.productsService.findOne(productId, input.tenantId),
      ),
    );
    const items: OrderItem[] = products.map((product, i) => ({
      productId: product.id,
      title: product.title,
      quantity: input.items[i].quantity,
      priceAtOrder: product.price,
    }));

    // A pre-order's deposit rules come from exactly one PREORDER collection —
    // reject anything that would make the deposit math ambiguous (mixing
    // preorder items from two different collections, or mixing preorder
    // items with regular in-stock ones in the same order).
    const preorderCollectionIds = new Set(
      products
        .map((p) => p.preorder?.collectionId)
        .filter((id): id is string => !!id),
    );
    if (preorderCollectionIds.size > 1) {
      throw new BadRequestException(
        'A pre-order can only include items from a single pre-order collection.',
      );
    }
    const preorder = products.find((p) => p.preorder)?.preorder ?? null;
    if (preorder && products.some((p) => !p.preorder)) {
      throw new BadRequestException(
        'Pre-order items cannot be mixed with regular items in the same order.',
      );
    }

    const total = items.reduce(
      (sum, item) => sum + item.priceAtOrder * item.quantity,
      0,
    );

    let depositAmount: number | undefined;
    let balanceAmount: number | undefined;
    if (preorder) {
      if (!input.whatsappNumber?.trim() || !input.deliveryAddress?.trim()) {
        throw new BadRequestException(
          'WhatsApp number and delivery address are required for pre-orders.',
        );
      }
      depositAmount =
        preorder.depositType === 'FULL'
          ? total
          : Math.round((total * (preorder.depositPercentage ?? 100)) / 100);
      balanceAmount = total - depositAmount;
    }

    const now = new Date();
    const history = [
      {
        status: 'PENDING' as OrderStatus,
        note: preorder
          ? 'Pre-order request submitted by customer'
          : 'Order request submitted by customer',
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
            type: preorder ? 'PREORDER' : 'STANDARD',
            depositType: preorder?.depositType,
            depositPercentage: preorder?.depositPercentage ?? undefined,
            depositAmount,
            balanceAmount,
            whatsappNumber: input.whatsappNumber?.trim() || undefined,
            deliveryAddress: input.deliveryAddress?.trim() || undefined,
            preorderCollectionId: preorder?.collectionId,
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

  // Public self-cancel: the tracking link alone only proves you know the
  // order exists, not that you're the customer, so we also require the
  // payment reference that was emailed to them at checkout.
  async cancelByToken(token: string, paymentReference: string): Promise<Order> {
    const existing = await this.findByTrackingToken(token);
    const submitted = (paymentReference ?? '').trim().toUpperCase();
    if (!submitted || submitted !== existing.paymentReference.toUpperCase()) {
      throw new BadRequestException(
        "That reference doesn't match this order. Check the email we sent you and try again.",
      );
    }
    if (existing.status !== 'PENDING' && existing.status !== 'CONFIRMED') {
      throw new BadRequestException('This order can no longer be cancelled.');
    }
    return this.updateStatus(
      existing.id,
      existing.tenantId,
      'CANCELLED',
      'Cancelled by customer',
    );
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
        completedAt:
          status === 'COMPLETED'
            ? now
            : existing.status === 'COMPLETED'
              ? null
              : undefined,
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

  // Undoes an accidental "Mark completed" — reverts to CONFIRMED so the
  // vendor can pick the right status from there. Only available for a short
  // window after completion; past that, the order is final.
  async reopen(id: string, tenantId: string): Promise<Order> {
    const existing = await this.findOne(id, tenantId);
    if (existing.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed orders can be reopened.');
    }
    const completedAt = existing.completedAt
      ? new Date(existing.completedAt)
      : null;
    if (
      !completedAt ||
      Date.now() - completedAt.getTime() > COMPLETION_REVERSAL_WINDOW_MS
    ) {
      throw new BadRequestException(
        'This order was completed too long ago to be reopened.',
      );
    }
    const now = new Date();
    const history = [
      ...existing.history,
      {
        status: 'CONFIRMED' as OrderStatus,
        note: 'Reopened by admin — marked completed in error',
        at: now.toISOString(),
      },
    ];
    const row = await this.prisma.order.update({
      where: { id: existing.id },
      data: { status: 'CONFIRMED', completedAt: null, history: history },
    });
    return mapOrder(row);
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
    // Preorder deposit/balance are a share of the total — if the vendor
    // adjusts quantities, they need to move with it rather than staying
    // pinned to the original total.
    let depositAmount = existing.depositAmount ?? undefined;
    let balanceAmount = existing.balanceAmount ?? undefined;
    if (existing.type === 'PREORDER') {
      depositAmount =
        existing.depositType === 'FULL'
          ? total
          : Math.round((total * (existing.depositPercentage ?? 100)) / 100);
      balanceAmount = total - depositAmount;
    }

    const row = await this.prisma.order.update({
      where: { id: existing.id },
      data: {
        items: items as unknown as Prisma.InputJsonValue,
        total,
        status: 'MODIFIED',
        confirmedAt: existing.confirmedAt ? undefined : now,
        history: history,
        depositAmount,
        balanceAmount,
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

  // Freeform pre-order engagement timeline — vendors post whatever update
  // makes sense for their product ("Fabric sourced", "Shipped from
  // supplier") without being constrained to a fixed set of stages. Each
  // post emails the customer; it doesn't change order status.
  async addOrderUpdate(
    id: string,
    tenantId: string,
    note: string,
  ): Promise<Order> {
    const existing = await this.findOne(id, tenantId);
    const now = new Date();
    const history = [
      ...existing.history,
      { status: existing.status, note, at: now.toISOString() },
    ];
    const row = await this.prisma.order.update({
      where: { id: existing.id },
      data: { history: history },
    });
    const order = mapOrder(row);
    void this.sendPreorderUpdateEmail(order, note).catch((err) =>
      this.logger.error('Failed to send pre-order update email', err),
    );
    return order;
  }

  async requestBalance(id: string, tenantId: string): Promise<Order> {
    const existing = await this.findOne(id, tenantId);
    if (existing.type !== 'PREORDER') {
      throw new BadRequestException('Only pre-orders have a balance due.');
    }
    if (existing.balancePaid) {
      throw new BadRequestException('Balance has already been paid.');
    }
    const now = new Date();
    const history = [
      ...existing.history,
      {
        status: existing.status,
        note: 'Balance payment requested',
        at: now.toISOString(),
      },
    ];
    const row = await this.prisma.order.update({
      where: { id: existing.id },
      data: { balanceRequestedAt: now, history: history },
    });
    const order = mapOrder(row);
    void this.sendPreorderBalanceDueEmail(order).catch((err) =>
      this.logger.error('Failed to send pre-order balance-due email', err),
    );
    return order;
  }

  async markBalancePaid(id: string, tenantId: string): Promise<Order> {
    const existing = await this.findOne(id, tenantId);
    if (existing.type !== 'PREORDER') {
      throw new BadRequestException('Only pre-orders have a balance due.');
    }
    const now = new Date();
    const history = [
      ...existing.history,
      {
        status: existing.status,
        note: 'Balance payment received',
        at: now.toISOString(),
      },
    ];
    const row = await this.prisma.order.update({
      where: { id: existing.id },
      data: { balancePaid: true, balancePaidAt: now, history: history },
    });
    return mapOrder(row);
  }

  private async sendPreorderUpdateEmail(
    order: Order,
    note: string,
  ): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl } = this.urls(tenant, order);
    await this.emailService.send({
      to: order.customerEmail,
      ...preorderUpdateEmail(order, tenant, trackUrl, note),
    });
  }

  private async sendPreorderBalanceDueEmail(order: Order): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl, payUrl } = this.urls(tenant, order);
    await this.emailService.send({
      to: order.customerEmail,
      ...preorderBalanceDueEmail(order, tenant, trackUrl, payUrl),
    });
  }
}
