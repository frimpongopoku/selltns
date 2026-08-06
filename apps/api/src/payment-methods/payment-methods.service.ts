import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PaymentMethod as PrismaPaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PaymentMethod } from '../common/types';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string): Promise<PrismaPaymentMethod[]> {
    return this.prisma.paymentMethod.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(
    input: Partial<PaymentMethod> & { tenantId: string },
  ): Promise<PrismaPaymentMethod> {
    return this.prisma.paymentMethod.create({
      data: {
        tenantId: input.tenantId,
        type: input.type ?? 'MOMO',
        label: input.label ?? 'Untitled method',
        details: input.details ?? {},
        isEnabled: input.isEnabled ?? true,
        isPreferred: false,
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    input: Partial<PaymentMethod>,
  ): Promise<PrismaPaymentMethod> {
    const existing = await this.prisma.paymentMethod.findFirst({
      where: { id, tenantId },
    });
    if (!existing)
      throw new NotFoundException(`Payment method ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      // Only one method can be preferred per tenant — unset the rest first.
      if (input.isPreferred) {
        await tx.paymentMethod.updateMany({
          where: { tenantId, id: { not: id } },
          data: { isPreferred: false },
        });
      }
      return tx.paymentMethod.update({
        where: { id: existing.id },
        data: {
          type: input.type ?? existing.type,
          label: input.label ?? existing.label,
          details:
            input.details !== undefined
              ? (input.details as Prisma.InputJsonValue)
              : (existing.details as Prisma.InputJsonValue),
          isEnabled: input.isEnabled ?? existing.isEnabled,
          isPreferred: input.isPreferred ?? existing.isPreferred,
        },
      });
    });
  }

  async remove(id: string, tenantId: string): Promise<{ id: string }> {
    const existing = await this.prisma.paymentMethod.findFirst({
      where: { id, tenantId },
    });
    if (!existing)
      throw new NotFoundException(`Payment method ${id} not found`);
    await this.prisma.paymentMethod.delete({ where: { id: existing.id } });
    return { id: existing.id };
  }
}
