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
import { discountedPrice } from '../products/products.utils';
import { AffiliatesService } from '../affiliates/affiliates.service';
import {
  EMAIL_SERVICE,
  type EmailMessage,
  type EmailService,
} from '../email/email.service';
import {
  affiliateMirrorOrderVendorEmail,
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
import type {
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Tenant,
} from '../common/types';
import { productLabel } from '../common/product-label';

// A product with sizes/colors needs one of each picked, and it has to be one
// the product still offers (the vendor may have edited the list while this
// sat in someone's cart). A product without them ignores whatever was sent.
function resolveOptions(
  product: Pick<Product, 'title' | 'number' | 'sizes' | 'colors'>,
  item: { size?: string | null; color?: string | null },
): { size: string | null; color: string | null } {
  const pick = (
    offered: string[],
    requested: string | null | undefined,
    noun: 'size' | 'color',
  ) => {
    if (offered.length === 0) return null;
    if (!requested || !offered.includes(requested)) {
      throw new BadRequestException(
        `Please choose a ${noun} for "${productLabel(product)}".`,
      );
    }
    return requested;
  };
  return {
    size: pick(product.sizes, item.size, 'size'),
    color: pick(product.colors, item.color, 'color'),
  };
}

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
    stockDeducted: row.stockDeducted,
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
    source: row.source,
    affiliateTenantId: row.affiliateTenantId,
    originatingOrderId: row.originatingOrderId,
  };
}

// Stock is taken off when the vendor commits to an order (confirms or
// modifies it), not when the customer places it, and goes back on cancel.
// Only the customer-facing order counts: an affiliate sale's owner-side
// mirror (source AFFILIATE) carries the same items and would double-count.
// Pre-orders are made to order, so they never touch stock either.
function countsTowardStock(order: Pick<Order, 'source' | 'type'>): boolean {
  return order.source === 'DIRECT' && order.type !== 'PREORDER';
}

const COMMITTED_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'MODIFIED',
  'COMPLETED',
];

// Net quantity per product — one product can be on an order several times
// in different sizes/colors, all drawing from the same stock.
function quantitiesByProduct(
  items: Pick<OrderItem, 'productId' | 'quantity'>[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(
      item.productId,
      (totals.get(item.productId) ?? 0) + item.quantity,
    );
  }
  return totals;
}

// Applies per-product stock changes (positive = take off, negative = put
// back) inside the caller's transaction. Taking off is a conditional
// decrement, so two vendors confirming at once can't push stock below
// zero — if there isn't enough left, the whole transaction is rejected.
// Products that are deleted or not tracking stock are skipped.
async function applyStockChanges(
  tx: Prisma.TransactionClient,
  changes: Map<string, number>,
): Promise<void> {
  for (const [productId, quantity] of changes) {
    if (quantity > 0) {
      const { count } = await tx.product.updateMany({
        where: { id: productId, trackStock: true, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (count > 0) continue;
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (product?.trackStock) {
        throw new BadRequestException(
          product.stock > 0
            ? `Only ${product.stock} of "${productLabel(product)}" left in stock. Update the stock or the order quantities first.`
            : `"${productLabel(product)}" is out of stock. Update the stock or the order quantities first.`,
        );
      }
    } else if (quantity < 0) {
      await tx.product.updateMany({
        where: { id: productId, trackStock: true },
        data: { stock: { increment: -quantity } },
      });
    }
  }
}

function negated(changes: Map<string, number>): Map<string, number> {
  return new Map([...changes].map(([id, quantity]) => [id, -quantity]));
}

export interface ManualOrderInput {
  customerName: string;
  customerContact?: string;
  customerEmail?: string;
  /** CONFIRMED = still to pay/deliver; COMPLETED = already done. */
  status: 'CONFIRMED' | 'COMPLETED';
  /** When the sale happened (ISO date) — defaults to now. */
  orderedAt?: string;
  note?: string;
  items: {
    productId: string;
    quantity: number;
    size?: string | null;
    color?: string | null;
    /** Price actually charged per item — defaults to the current price. */
    price?: number;
  }[];
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
    logoUrl: row.logoUrl,
    customDomain: row.customDomain,
    domainVerified: row.domainVerified,
    phoneNumber: row.phoneNumber,
    whatsappNumber: row.whatsappNumber,
    ownerDisplayName: row.ownerDisplayName,
    ownerTitle: row.ownerTitle,
    ownerBio: row.ownerBio,
    ownerInfoVisible: row.ownerInfoVisible,
    contactEmail: row.contactEmail,
    contactSectionVisible: row.contactSectionVisible,
    bespokeRequestsEnabled: row.bespokeRequestsEnabled,
    affiliateDisclosureVisible: row.affiliateDisclosureVisible,
    heroTagline: row.heroTagline,
    footerTagline: row.footerTagline,
    themeTokens: row.themeTokens as unknown as Tenant['themeTokens'],
    createdAt: row.createdAt.toISOString(),
    verificationStatus: row.verificationStatus,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    suspended: row.suspended,
    suspendedAt: row.suspendedAt?.toISOString() ?? null,
    suspendedReason: row.suspendedReason,
    plan: row.plan,
    planUpdatedAt: row.planUpdatedAt?.toISOString() ?? null,
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
    private readonly affiliatesService: AffiliatesService,
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

  async findAll(
    tenantId: string,
    source?: 'DIRECT' | 'AFFILIATE',
  ): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { tenantId, source },
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
    items: {
      productId: string;
      quantity: number;
      size?: string | null;
      color?: string | null;
    }[];
  }): Promise<Order> {
    // Each cart line item is either native to the buying tenant, or an
    // affiliate-listed product from a shop that made this tenant an
    // affiliate — resolved the same "price at order time, never trust the
    // client" way either way. A cart can sit unsubmitted long enough for a
    // vendor to unpublish one of its products, so both paths reject a
    // product that's no longer active rather than silently ordering it —
    // the client-side cart validation is only a UX nicety, not the guard.
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException(
          'Each item needs a quantity of at least 1.',
        );
      }
    }
    const resolvedItems = await Promise.all(
      input.items.map(async (item) => {
        const native = await this.productsService
          .findOne(item.productId, input.tenantId)
          .catch(() => null);
        if (native) {
          if (!native.isActive) {
            throw new BadRequestException(
              `"${productLabel(native)}" is no longer available.`,
            );
          }
          return {
            productId: native.id,
            title: productLabel(native),
            quantity: item.quantity,
            ...resolveOptions(native, item),
            priceAtOrder: discountedPrice(native),
            preorder: native.preorder ?? null,
            stock: native.trackStock ? native.stock : null,
            affiliateOwnerTenantId: null as string | null,
            affiliateOwnerPrice: null as number | null,
          };
        }
        const resolved = await this.affiliatesService.resolveOrderableListing(
          item.productId,
          input.tenantId,
        );
        if (!resolved) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }
        if (!resolved.product.isActive) {
          throw new BadRequestException(
            `"${productLabel(resolved.product)}" is no longer available.`,
          );
        }
        return {
          productId: resolved.product.id,
          title: productLabel(resolved.product),
          quantity: item.quantity,
          ...resolveOptions(resolved.product, item),
          priceAtOrder: resolved.effectivePrice,
          preorder: resolved.product.preorder ?? null,
          stock: resolved.product.trackStock ? resolved.product.stock : null,
          affiliateOwnerTenantId: resolved.relationship.ownerTenantId,
          affiliateOwnerPrice: resolved.product.price,
        };
      }),
    );
    // Nobody can order more than is in stock right now. Stock isn't taken
    // off until the vendor confirms, so this doesn't reserve anything —
    // confirmation re-checks against whatever's left by then.
    const requested = quantitiesByProduct(resolvedItems);
    for (const r of resolvedItems) {
      if (r.preorder || r.stock === null) continue;
      const wanted = requested.get(r.productId) ?? 0;
      if (wanted > r.stock) {
        throw new BadRequestException(
          r.stock > 0
            ? `Only ${r.stock} of "${r.title}" left in stock.`
            : `"${r.title}" is out of stock.`,
        );
      }
    }

    const items: OrderItem[] = resolvedItems.map((r) => ({
      productId: r.productId,
      title: r.title,
      quantity: r.quantity,
      priceAtOrder: r.priceAtOrder,
      size: r.size,
      color: r.color,
    }));

    const affiliateItems = resolvedItems.filter(
      (
        r,
      ): r is typeof r & {
        affiliateOwnerTenantId: string;
        affiliateOwnerPrice: number;
      } => r.affiliateOwnerTenantId !== null,
    );
    const affiliateOwnerTenantIds = new Set(
      affiliateItems.map((r) => r.affiliateOwnerTenantId),
    );
    if (affiliateOwnerTenantIds.size > 1) {
      throw new BadRequestException(
        'An order can only include affiliate products from a single shop at a time.',
      );
    }
    const affiliateOwnerTenantId =
      affiliateOwnerTenantIds.size === 1
        ? [...affiliateOwnerTenantIds][0]
        : null;

    // A pre-order's deposit rules come from exactly one PREORDER collection —
    // reject anything that would make the deposit math ambiguous (mixing
    // preorder items from two different collections, or mixing preorder
    // items with regular in-stock ones in the same order).
    const preorderCollectionIds = new Set(
      resolvedItems
        .map((r) => r.preorder?.collectionId)
        .filter((id): id is string => !!id),
    );
    if (preorderCollectionIds.size > 1) {
      throw new BadRequestException(
        'A pre-order can only include items from a single pre-order collection.',
      );
    }
    const preorder = resolvedItems.find((r) => r.preorder)?.preorder ?? null;
    if (preorder && resolvedItems.some((r) => !r.preorder)) {
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

    // Affiliate-sourced items also need a mirror order auto-created on the
    // owner's tenant, at the owner's own price — that's their actual
    // receivable, not the affiliate's marked-up price. Its buyer fields
    // deliberately withhold the real customer's contact/delivery info
    // (that stays between the affiliate and their customer) and instead
    // point the owner at the affiliate to coordinate fulfillment.
    let ownerMirrorItems: OrderItem[] = [];
    let ownerMirrorTotal = 0;
    let affiliateTenant: Tenant | null = null;
    if (affiliateOwnerTenantId) {
      ownerMirrorItems = affiliateItems.map((r) => ({
        productId: r.productId,
        title: r.title,
        quantity: r.quantity,
        priceAtOrder: r.affiliateOwnerPrice,
        size: r.size,
        color: r.color,
      }));
      ownerMirrorTotal = ownerMirrorItems.reduce(
        (sum, item) => sum + item.priceAtOrder * item.quantity,
        0,
      );
      affiliateTenant = await this.getTenant(input.tenantId);
    }

    // Collisions are astronomically unlikely (random tokens/refs), but retry
    // a few times against the unique-constraint error rather than trust luck.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const { affiliateRow } = await this.prisma.$transaction(async (tx) => {
          const affiliateRow = await tx.order.create({
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

          if (!affiliateOwnerTenantId || !affiliateTenant) {
            return { affiliateRow, mirrorRow: null };
          }

          const mirrorRow = await tx.order.create({
            data: {
              tenantId: affiliateOwnerTenantId,
              customerName: `Sold via ${affiliateTenant.name}`,
              customerContact:
                affiliateTenant.whatsappNumber ||
                `Contact ${affiliateTenant.name} via their Selltns dashboard`,
              customerEmail: input.customerEmail,
              status: 'PENDING',
              items: ownerMirrorItems as unknown as Prisma.InputJsonValue,
              total: ownerMirrorTotal,
              trackingToken: generateTrackingToken(),
              paymentReference: generatePaymentReference(),
              history: [
                {
                  status: 'PENDING',
                  note: `Auto-created — sold via affiliate ${affiliateTenant.name}`,
                  at: now.toISOString(),
                },
              ],
              type: 'STANDARD',
              source: 'AFFILIATE',
              affiliateTenantId: input.tenantId,
              originatingOrderId: affiliateRow.id,
            },
          });
          return { affiliateRow, mirrorRow };
        });

        const order = mapOrder(affiliateRow);
        void this.sendOrderPlacedEmails(order).catch((err) =>
          this.logger.error('Failed to send order-placed emails', err),
        );
        // The owner isn't emailed about the mirror order yet — not until
        // the affiliate reviews and confirms their own order with the
        // customer (see updateStatus below). A record exists on the
        // owner's tenant immediately either way, just silently.
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

  // Records a sale the vendor made outside the storefront. It goes straight
  // to CONFIRMED/COMPLETED (the vendor already agreed it with the customer),
  // takes its stock off immediately, and sends no emails — the customer
  // never went through checkout, so a "we got your request" email would only
  // confuse them. Only the tenant's own products; resold ones are ordered
  // through the owner's storefront flow.
  async createManual(
    tenantId: string,
    input: ManualOrderInput,
  ): Promise<Order> {
    const customerName = input.customerName?.trim();
    if (!customerName) {
      throw new BadRequestException("Enter the customer's name.");
    }
    if (input.status !== 'CONFIRMED' && input.status !== 'COMPLETED') {
      throw new BadRequestException('Choose whether the order is done yet.');
    }
    if (!input.items?.length) {
      throw new BadRequestException('Add at least one product.');
    }
    const now = new Date();
    const orderedAt = input.orderedAt ? new Date(input.orderedAt) : now;
    if (Number.isNaN(orderedAt.getTime()) || orderedAt > now) {
      throw new BadRequestException("The order date can't be in the future.");
    }

    const products = await Promise.all(
      input.items.map((item) =>
        this.productsService.findOne(item.productId, tenantId),
      ),
    );
    const items: OrderItem[] = input.items.map((item, i) => {
      const product = products[i];
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException(
          `"${productLabel(product)}" needs a quantity of at least 1.`,
        );
      }
      const price = item.price ?? discountedPrice(product);
      if (!Number.isInteger(price) || price < 0) {
        throw new BadRequestException(
          `"${productLabel(product)}" needs a price of 0 or more.`,
        );
      }
      return {
        productId: product.id,
        title: productLabel(product),
        quantity: item.quantity,
        priceAtOrder: price,
        ...resolveOptions(product, item),
      };
    });
    const total = items.reduce(
      (sum, item) => sum + item.priceAtOrder * item.quantity,
      0,
    );
    // Pre-order pieces are made to order and legitimately sit at 0 stock —
    // an order containing one leaves stock alone entirely, same as a
    // checkout pre-order.
    const takeStock = !products.some((p) => p.preorder);
    const note = input.note?.trim();
    const history = [
      {
        status: input.status as OrderStatus,
        note: `Recorded by the shop${note ? ` — ${note}` : ''}`,
        at: orderedAt.toISOString(),
      },
    ];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const row = await this.prisma.$transaction(async (tx) => {
          if (takeStock) {
            await applyStockChanges(tx, quantitiesByProduct(items));
          }
          return tx.order.create({
            data: {
              tenantId,
              customerName,
              customerContact: input.customerContact?.trim() ?? '',
              customerEmail: input.customerEmail?.trim() ?? '',
              status: input.status,
              items: items as unknown as Prisma.InputJsonValue,
              total,
              trackingToken: generateTrackingToken(),
              paymentReference: generatePaymentReference(),
              history,
              createdAt: orderedAt,
              confirmedAt: orderedAt,
              completedAt: input.status === 'COMPLETED' ? orderedAt : null,
              // Nothing to flag as new — the vendor entered it themselves.
              seenByAdminAt: now,
              stockDeducted: takeStock,
            },
          });
        });
        return mapOrder(row);
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

  // The mirrored order withholds the customer's own contact details (see
  // above) — this is what actually tells the owner who made the sale and
  // to coordinate fulfillment with them.
  private async sendAffiliateMirrorOrderEmail(
    mirrorOrder: Order,
  ): Promise<void> {
    if (!mirrorOrder.affiliateTenantId) return;
    const [ownerTenant, affiliateTenant, vendorEmails] = await Promise.all([
      this.getTenant(mirrorOrder.tenantId),
      this.getTenant(mirrorOrder.affiliateTenantId),
      this.getVendorEmails(mirrorOrder.tenantId),
    ]);
    if (vendorEmails.length === 0) return;
    const { adminUrl } = this.urls(ownerTenant, mirrorOrder);
    await this.emailService.send({
      to: vendorEmails,
      ...affiliateMirrorOrderVendorEmail(
        mirrorOrder,
        ownerTenant,
        affiliateTenant.name,
        adminUrl,
      ),
    });
  }

  // Called when an affiliate's own (source: DIRECT) order transitions to
  // CONFIRMED — that's "the affiliate has reviewed and confirmed" the sale,
  // which is when the owner should first hear about it, not the instant
  // the customer placed it.
  private async sendAffiliateMirrorOrderEmailIfAny(
    order: Order,
  ): Promise<void> {
    if (order.source !== 'DIRECT') return;
    const mirror = await this.prisma.order.findUnique({
      where: { originatingOrderId: order.id },
    });
    if (!mirror) return;
    await this.sendAffiliateMirrorOrderEmail(mapOrder(mirror));
  }

  // An order recorded by the vendor (see createManual) may have no customer
  // email at all — every customer-facing email goes through here so those
  // are skipped rather than sent to an empty address.
  private async sendToCustomer(
    order: Order,
    message: Omit<EmailMessage, 'to'>,
  ): Promise<void> {
    if (!order.customerEmail) return;
    await this.emailService.send({ to: order.customerEmail, ...message });
  }

  private async sendOrderPlacedEmails(order: Order): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl, adminUrl } = this.urls(tenant, order);
    await this.sendToCustomer(order, {
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
    await this.sendToCustomer(order, {
      ...orderConfirmedCustomerEmail(order, tenant, trackUrl, payUrl),
    });
  }

  private async sendOrderCompletedEmail(order: Order): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl } = this.urls(tenant, order);
    await this.sendToCustomer(order, {
      ...orderCompletedCustomerEmail(order, tenant, trackUrl),
    });
  }

  private async sendOrderCancelledEmail(order: Order): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl } = this.urls(tenant, order);
    await this.sendToCustomer(order, {
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
    // Only a fresh commitment (from PENDING, or reviving a cancelled order)
    // takes stock off — an order confirmed before stock tracking existed
    // moving on to COMPLETED leaves stock alone.
    const takeStock =
      countsTowardStock(existing) &&
      !existing.stockDeducted &&
      COMMITTED_STATUSES.includes(status) &&
      (existing.status === 'PENDING' || existing.status === 'CANCELLED');
    const returnStock = existing.stockDeducted && status === 'CANCELLED';
    const row = await this.prisma.$transaction(async (tx) => {
      if (takeStock) {
        await applyStockChanges(tx, quantitiesByProduct(existing.items));
      } else if (returnStock) {
        await applyStockChanges(
          tx,
          negated(quantitiesByProduct(existing.items)),
        );
      }
      return tx.order.update({
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
          stockDeducted: takeStock ? true : returnStock ? false : undefined,
        },
      });
    });
    const order = mapOrder(row);
    if (status !== existing.status) {
      if (status === 'CONFIRMED') {
        void this.sendOrderConfirmedEmail(order).catch((err) =>
          this.logger.error('Failed to send order-confirmed email', err),
        );
        void this.sendAffiliateMirrorOrderEmailIfAny(order).catch((err) =>
          this.logger.error('Failed to send affiliate mirror-order email', err),
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

    // Modifying confirms the order, so stock follows: an order whose stock
    // is already off only moves by the difference; a not-yet-confirmed one
    // takes the new quantities off in full.
    let stockChanges: Map<string, number> | null = null;
    if (existing.stockDeducted) {
      stockChanges = quantitiesByProduct(items);
      for (const [productId, quantity] of quantitiesByProduct(existing.items)) {
        stockChanges.set(
          productId,
          (stockChanges.get(productId) ?? 0) - quantity,
        );
      }
    } else if (countsTowardStock(existing) && !existing.confirmedAt) {
      stockChanges = quantitiesByProduct(items);
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (stockChanges) await applyStockChanges(tx, stockChanges);
      return tx.order.update({
        where: { id: existing.id },
        data: {
          items: items as unknown as Prisma.InputJsonValue,
          total,
          status: 'MODIFIED',
          confirmedAt: existing.confirmedAt ? undefined : now,
          history: history,
          depositAmount,
          balanceAmount,
          stockDeducted: stockChanges ? true : undefined,
        },
      });
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
    await this.sendToCustomer(order, {
      ...preorderUpdateEmail(order, tenant, trackUrl, note),
    });
  }

  private async sendPreorderBalanceDueEmail(order: Order): Promise<void> {
    const tenant = await this.getTenant(order.tenantId);
    const { trackUrl, payUrl } = this.urls(tenant, order);
    await this.sendToCustomer(order, {
      ...preorderBalanceDueEmail(order, tenant, trackUrl, payUrl),
    });
  }
}
