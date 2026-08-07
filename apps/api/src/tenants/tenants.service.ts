import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RESERVED_SLUGS } from '../common/reserved-slugs';
import type { Tenant, ThemeTokens } from '../common/types';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface SlugAvailability {
  available: boolean;
  reason?: 'invalid' | 'reserved' | 'taken';
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Store "${slug}" not found`);
    return tenant as unknown as Tenant;
  }

  async checkSlugAvailability(slug: string): Promise<SlugAvailability> {
    if (slug.length < 3 || slug.length > 63 || !SLUG_PATTERN.test(slug)) {
      return { available: false, reason: 'invalid' };
    }
    if (RESERVED_SLUGS.has(slug)) {
      return { available: false, reason: 'reserved' };
    }
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    return existing ? { available: false, reason: 'taken' } : { available: true };
  }

  async updateTheme(tenantId: string, themeTokens: ThemeTokens): Promise<Tenant> {
    const tenant = await this.prisma.tenant
      .update({
        where: { id: tenantId },
        data: { themeTokens: themeTokens as object },
      })
      .catch(() => {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      });
    return tenant as unknown as Tenant;
  }

  async updateProfile(
    tenantId: string,
    input: { whatsappNumber?: string | null },
  ): Promise<Tenant> {
    const tenant = await this.prisma.tenant
      .update({
        where: { id: tenantId },
        data: { whatsappNumber: input.whatsappNumber },
      })
      .catch(() => {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      });
    return tenant as unknown as Tenant;
  }
}
