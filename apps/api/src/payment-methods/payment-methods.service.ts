import { Injectable, NotFoundException } from '@nestjs/common';
import { paymentMethods as seedPaymentMethods } from '../common/seed-data';
import { PaymentMethod } from '../common/types';

@Injectable()
export class PaymentMethodsService {
  private methods: PaymentMethod[] = [...seedPaymentMethods];

  findAll(): PaymentMethod[] {
    return this.methods;
  }

  create(input: Partial<PaymentMethod>): PaymentMethod {
    const method: PaymentMethod = {
      id: `pay_${Date.now()}`,
      tenantId: 'tenant_demo',
      type: input.type ?? 'MOMO',
      label: input.label ?? 'Untitled method',
      details: input.details ?? {},
      isEnabled: input.isEnabled ?? true,
      isPreferred: false,
    };
    this.methods = [...this.methods, method];
    return method;
  }

  update(id: string, input: Partial<PaymentMethod>): PaymentMethod {
    const existing = this.methods.find((m) => m.id === id);
    if (!existing) throw new NotFoundException(`Payment method ${id} not found`);
    let updated = { ...existing, ...input, id: existing.id };
    if (updated.isPreferred) {
      this.methods = this.methods.map((m) => ({ ...m, isPreferred: false }));
    } else {
      this.methods = [...this.methods];
    }
    this.methods = this.methods.map((m) => (m.id === existing.id ? updated : m));
    return updated;
  }

  remove(id: string): { id: string } {
    this.methods = this.methods.filter((m) => m.id !== id);
    return { id };
  }
}
