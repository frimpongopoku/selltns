import { Injectable, NotFoundException } from '@nestjs/common';
import { paymentMethods as seedPaymentMethods } from '../common/seed-data';
import { PaymentMethod } from '../common/types';

@Injectable()
export class PaymentMethodsService {
  private methods: PaymentMethod[] = [...seedPaymentMethods];

  findAll(tenantId: string): PaymentMethod[] {
    return this.methods.filter((m) => m.tenantId === tenantId);
  }

  create(input: Partial<PaymentMethod> & { tenantId: string }): PaymentMethod {
    const method: PaymentMethod = {
      id: `pay_${Date.now()}`,
      tenantId: input.tenantId,
      type: input.type ?? 'MOMO',
      label: input.label ?? 'Untitled method',
      details: input.details ?? {},
      isEnabled: input.isEnabled ?? true,
      isPreferred: false,
    };
    this.methods = [...this.methods, method];
    return method;
  }

  update(id: string, tenantId: string, input: Partial<PaymentMethod>): PaymentMethod {
    const existing = this.methods.find((m) => m.id === id && m.tenantId === tenantId);
    if (!existing) throw new NotFoundException(`Payment method ${id} not found`);
    const updated = { ...existing, ...input, id: existing.id, tenantId: existing.tenantId };
    if (updated.isPreferred) {
      this.methods = this.methods.map((m) =>
        m.tenantId === tenantId ? { ...m, isPreferred: false } : m,
      );
    }
    this.methods = this.methods.map((m) => (m.id === existing.id ? updated : m));
    return updated;
  }

  remove(id: string, tenantId: string): { id: string } {
    const existing = this.methods.find((m) => m.id === id && m.tenantId === tenantId);
    if (!existing) throw new NotFoundException(`Payment method ${id} not found`);
    this.methods = this.methods.filter((m) => m.id !== existing.id);
    return { id: existing.id };
  }
}
