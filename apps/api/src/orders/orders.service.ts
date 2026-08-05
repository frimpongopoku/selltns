import { Injectable, NotFoundException } from '@nestjs/common';
import { orders as seedOrders } from '../common/seed-data';
import { Order, OrderItem, OrderStatus } from '../common/types';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  private orders: Order[] = [...seedOrders];

  constructor(private readonly productsService: ProductsService) {}

  findAll(tenantId: string): Order[] {
    return this.orders
      .filter((o) => o.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findOne(id: string, tenantId: string): Order {
    const order = this.orders.find((o) => o.id === id && o.tenantId === tenantId);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  findByTrackingToken(token: string): Order {
    const order = this.orders.find((o) => o.trackingToken === token);
    if (!order) throw new NotFoundException(`Tracking link not found`);
    return order;
  }

  create(input: {
    tenantId: string;
    customerName: string;
    customerContact: string;
    items: { productId: string; quantity: number }[];
  }): Order {
    const items: OrderItem[] = input.items.map(({ productId, quantity }) => {
      const product = this.productsService.findOne(productId, input.tenantId);
      return {
        productId: product.id,
        title: product.title,
        quantity,
        priceAtOrder: product.price,
      };
    });
    const total = items.reduce(
      (sum, item) => sum + item.priceAtOrder * item.quantity,
      0,
    );
    const order: Order = {
      id: `order_${Date.now()}`,
      tenantId: input.tenantId,
      customerName: input.customerName,
      customerContact: input.customerContact,
      status: 'PENDING',
      items,
      total,
      trackingToken: `trk_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      seenByAdminAt: null,
      history: [
        {
          status: 'PENDING',
          note: 'Order request submitted by customer',
          at: new Date().toISOString(),
        },
      ],
    };
    this.orders = [order, ...this.orders];
    return order;
  }

  updateStatus(id: string, tenantId: string, status: OrderStatus, note?: string): Order {
    const existing = this.findOne(id, tenantId);
    const now = new Date().toISOString();
    const updated: Order = {
      ...existing,
      status,
      confirmedAt:
        status === 'CONFIRMED' ? now : existing.confirmedAt,
      history: [
        ...existing.history,
        { status, note: note ?? `Status changed to ${status}`, at: now },
      ],
    };
    this.orders = this.orders.map((o) => (o.id === existing.id ? updated : o));
    return updated;
  }

  markSeen(id: string, tenantId: string): Order {
    const existing = this.findOne(id, tenantId);
    if (existing.seenByAdminAt) return existing;
    const updated: Order = { ...existing, seenByAdminAt: new Date().toISOString() };
    this.orders = this.orders.map((o) => (o.id === existing.id ? updated : o));
    return updated;
  }

  modifyItems(id: string, tenantId: string, items: OrderItem[], note?: string): Order {
    const existing = this.findOne(id, tenantId);
    const total = items.reduce(
      (sum, item) => sum + item.priceAtOrder * item.quantity,
      0,
    );
    const now = new Date().toISOString();
    const updated: Order = {
      ...existing,
      items,
      total,
      status: 'MODIFIED',
      history: [
        ...existing.history,
        { status: 'MODIFIED', note: note ?? 'Order modified by admin', at: now },
      ],
    };
    this.orders = this.orders.map((o) => (o.id === existing.id ? updated : o));
    return updated;
  }
}
