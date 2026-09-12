import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Product as PrismaProduct } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service';
import {
  affiliateAcceptedEmail,
  affiliateDeclinedEmail,
  affiliateInviteEmail,
  affiliatePriceClampedEmail,
  affiliateTerminatedEmail,
} from '../email/templates';
import {
  MAX_FIXED_CAP,
  MAX_PERCENTAGE_CAP,
  MIN_FIXED_CAP,
  MIN_PERCENTAGE_CAP,
} from './affiliates.constants';
import type {
  AffiliateCapType,
  AffiliateEligibleProduct,
  AffiliateListing,
  AffiliateRelationship,
  PreorderInfo,
  Product,
  Tenant,
} from '../common/types';
import {
  attachPreorderInfo,
  getPreorderInfoMap,
} from '../common/preorder-info';

const RELATIONSHIP_INCLUDE = {
  ownerTenant: { select: { id: true, name: true, slug: true } },
  affiliateTenant: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.AffiliateRelationshipInclude;

type RelationshipRow = Prisma.AffiliateRelationshipGetPayload<{
  include: typeof RELATIONSHIP_INCLUDE;
}>;

type HistoryEntry = { event: string; note: string; at: string };

function historyEntry(event: string, note: string): HistoryEntry {
  return { event, note, at: new Date().toISOString() };
}

function mapRelationship(row: RelationshipRow): AffiliateRelationship {
  return {
    id: row.id,
    ownerTenantId: row.ownerTenantId,
    affiliateTenantId: row.affiliateTenantId,
    status: row.status,
    capType: row.capType,
    capValue: row.capValue,
    invitedAt: row.invitedAt.toISOString(),
    invitedByUserId: row.invitedByUserId,
    respondedAt: row.respondedAt?.toISOString() ?? null,
    respondedByUserId: row.respondedByUserId,
    terminatedAt: row.terminatedAt?.toISOString() ?? null,
    terminatedByUserId: row.terminatedByUserId,
    history: row.history as unknown as HistoryEntry[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerTenant: row.ownerTenant,
    affiliateTenant: row.affiliateTenant,
  };
}

function mapProduct(
  row: PrismaProduct,
  preorder: PreorderInfo | null = null,
): Product {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    slug: row.slug,
    description: row.description,
    price: row.price,
    // An owner's own discount is never carried onto a reseller's storefront —
    // affiliate pricing already has its own independent override/cap system.
    discountPrice: null,
    // Already folded into ownerPrice/effectivePrice below (see
    // affiliateBasePrice) — never shown raw on a reseller's own storefront,
    // right next to the very listing it prices.
    affiliatePrice: null,
    // Whatever this value is, a product an affiliate can actually see here
    // is by definition not hidden from them.
    hiddenFromAllAffiliates: false,
    sku: row.sku,
    stock: row.stock,
    trackStock: row.trackStock,
    isActive: row.isActive,
    images: row.images,
    videoUrls: row.videoUrls,
    tags: row.tags,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    preorder,
  };
}

// The price this product is priced from for every affiliate computation
// below — the owner's custom affiliate price when they've set one,
// otherwise their regular price. This is the actual "source of truth" an
// owner controls from the product editing pane; everything else here
// (caps, overrides, clamping) builds on top of it exactly as it did on the
// regular price before affiliate pricing existed.
function affiliateBasePrice(product: {
  price: number;
  affiliatePrice: number | null;
}): number {
  return product.affiliatePrice ?? product.price;
}

// FIXED = a flat GHS ceiling on top of the owner's price; PERCENTAGE = a
// ceiling expressed as a percentage of it. The owner's price is always the
// source of truth — this is recomputed fresh every time, never cached.
function capCeiling(
  capType: AffiliateCapType,
  capValue: number,
  ownerPrice: number,
): number {
  return capType === 'FIXED'
    ? ownerPrice + capValue
    : Math.floor((ownerPrice * (100 + capValue)) / 100);
}

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);
  private readonly webOrigin =
    process.env.WEB_ORIGIN ?? 'http://localhost:4310';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  private async getOwnerRoleEmails(tenantId: string): Promise<string[]> {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { tenantId, role: 'OWNER', acceptedAt: { not: null } },
      include: { user: true },
    });
    return memberships.map((m) => m.user.email);
  }

  private validateCap(capType: AffiliateCapType, capValue: number) {
    if (!Number.isInteger(capValue)) {
      throw new BadRequestException('Cap value must be a whole number.');
    }
    if (capType === 'FIXED') {
      if (capValue < MIN_FIXED_CAP || capValue > MAX_FIXED_CAP) {
        throw new BadRequestException(
          `Fixed cap must be between GHS ${MIN_FIXED_CAP} and GHS ${MAX_FIXED_CAP}.`,
        );
      }
    } else if (capValue < MIN_PERCENTAGE_CAP || capValue > MAX_PERCENTAGE_CAP) {
      throw new BadRequestException(
        `Percentage cap must be between ${MIN_PERCENTAGE_CAP}% and ${MAX_PERCENTAGE_CAP}%.`,
      );
    }
  }

  // Loads a relationship the caller is a party to (either side) — every
  // `:id` route uses this so a caller can never probe/act on a relationship
  // between two other tenants.
  private async loadRelationship(
    id: string,
    tenantId: string,
  ): Promise<RelationshipRow> {
    const row = await this.prisma.affiliateRelationship.findFirst({
      where: {
        id,
        OR: [{ ownerTenantId: tenantId }, { affiliateTenantId: tenantId }],
      },
      include: RELATIONSHIP_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(`Affiliate relationship ${id} not found`);
    }
    return row;
  }

  async findOutgoing(ownerTenantId: string): Promise<AffiliateRelationship[]> {
    const rows = await this.prisma.affiliateRelationship.findMany({
      where: { ownerTenantId },
      include: RELATIONSHIP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapRelationship);
  }

  async findIncoming(
    affiliateTenantId: string,
  ): Promise<AffiliateRelationship[]> {
    const rows = await this.prisma.affiliateRelationship.findMany({
      where: { affiliateTenantId },
      include: RELATIONSHIP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapRelationship);
  }

  // Invites work by shop slug, not a click-through link — the owner already
  // knows the affiliate's storefront. Re-inviting a DECLINED/TERMINATED pair
  // reuses the same row (status flips back to PENDING) rather than creating
  // a duplicate, so `history` always holds this pair's full lifecycle.
  async invite(
    ownerTenantId: string,
    invitedByUserId: string,
    input: {
      affiliateSlug: string;
      capType: AffiliateCapType;
      capValue: number;
    },
  ): Promise<AffiliateRelationship> {
    const slug = input.affiliateSlug.trim().toLowerCase();
    if (!slug) {
      throw new BadRequestException('Affiliate shop slug is required.');
    }
    this.validateCap(input.capType, input.capValue);

    const ownerTenant = await this.prisma.tenant.findUnique({
      where: { id: ownerTenantId },
    });
    if (!ownerTenant) throw new NotFoundException('Owner tenant not found');
    if (ownerTenant.slug === slug) {
      throw new BadRequestException("You can't affiliate with your own shop.");
    }

    const affiliateTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (!affiliateTenant) {
      throw new NotFoundException(`No shop found at "${slug}".`);
    }

    const existing = await this.prisma.affiliateRelationship.findUnique({
      where: {
        ownerTenantId_affiliateTenantId: {
          ownerTenantId,
          affiliateTenantId: affiliateTenant.id,
        },
      },
    });
    if (existing?.status === 'ACTIVE') {
      throw new BadRequestException(
        `${affiliateTenant.name} is already an active affiliate.`,
      );
    }
    if (existing?.status === 'PENDING') {
      throw new BadRequestException(
        `${affiliateTenant.name} already has a pending invite.`,
      );
    }

    const capNote =
      input.capType === 'FIXED'
        ? `up to GHS ${input.capValue} extra`
        : `up to ${input.capValue}% extra`;
    const history = [
      ...((existing?.history as unknown as HistoryEntry[]) ?? []),
      historyEntry('invited', `Invited by ${ownerTenant.name} — ${capNote}`),
    ];

    const row = existing
      ? await this.prisma.affiliateRelationship.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            capType: input.capType,
            capValue: input.capValue,
            invitedAt: new Date(),
            invitedByUserId,
            respondedAt: null,
            respondedByUserId: null,
            terminatedAt: null,
            terminatedByUserId: null,
            history,
          },
          include: RELATIONSHIP_INCLUDE,
        })
      : await this.prisma.affiliateRelationship.create({
          data: {
            ownerTenantId,
            affiliateTenantId: affiliateTenant.id,
            capType: input.capType,
            capValue: input.capValue,
            invitedByUserId,
            history,
          },
          include: RELATIONSHIP_INCLUDE,
        });

    const relationship = mapRelationship(row);
    const reviewUrl = `${this.webOrigin}/admin/affiliates`;
    void this.getOwnerRoleEmails(affiliateTenant.id)
      .then((emails) =>
        emails.length === 0
          ? undefined
          : this.emailService.send({
              to: emails,
              ...affiliateInviteEmail(
                relationship,
                ownerTenant as unknown as Tenant,
                affiliateTenant as unknown as Tenant,
                reviewUrl,
              ),
            }),
      )
      .catch((err) =>
        this.logger.error(`Failed to send affiliate invite email: ${err}`),
      );

    return relationship;
  }

  async accept(
    id: string,
    affiliateTenantId: string,
    userId: string,
  ): Promise<AffiliateRelationship> {
    const existing = await this.loadRelationship(id, affiliateTenantId);
    if (existing.affiliateTenantId !== affiliateTenantId) {
      throw new ForbiddenException(
        'Only the invited shop can accept this invite.',
      );
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('This invite is no longer pending.');
    }

    const exemptions = await this.prisma.affiliateProductExemption.findMany({
      where: { relationshipId: id },
      select: { productId: true },
    });
    const exemptProductIds = exemptions.map((e) => e.productId);
    const ownerProducts = await this.prisma.product.findMany({
      where: {
        tenantId: existing.ownerTenantId,
        id: { notIn: exemptProductIds },
        hiddenFromAllAffiliates: false,
      },
      select: { id: true },
    });

    const history = [
      ...(existing.history as unknown as HistoryEntry[]),
      historyEntry('accepted', `Accepted by ${existing.affiliateTenant.name}`),
    ];

    const [row] = await this.prisma.$transaction([
      this.prisma.affiliateRelationship.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          respondedAt: new Date(),
          respondedByUserId: userId,
          history,
        },
        include: RELATIONSHIP_INCLUDE,
      }),
      this.prisma.affiliateProductListing.createMany({
        data: ownerProducts.map((p) => ({
          relationshipId: id,
          productId: p.id,
        })),
        skipDuplicates: true,
      }),
    ]);

    const relationship = mapRelationship(row);
    void this.getOwnerRoleEmails(relationship.ownerTenantId)
      .then((emails) =>
        emails.length === 0
          ? undefined
          : this.emailService.send({
              to: emails,
              ...affiliateAcceptedEmail(
                relationship,
                existing.affiliateTenant as unknown as Tenant,
                existing.ownerTenant as unknown as Tenant,
                `${this.webOrigin}/admin/affiliates`,
              ),
            }),
      )
      .catch((err) =>
        this.logger.error(`Failed to send affiliate accepted email: ${err}`),
      );

    return relationship;
  }

  async decline(
    id: string,
    affiliateTenantId: string,
    userId: string,
  ): Promise<AffiliateRelationship> {
    const existing = await this.loadRelationship(id, affiliateTenantId);
    if (existing.affiliateTenantId !== affiliateTenantId) {
      throw new ForbiddenException(
        'Only the invited shop can decline this invite.',
      );
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('This invite is no longer pending.');
    }

    const history = [
      ...(existing.history as unknown as HistoryEntry[]),
      historyEntry('declined', `Declined by ${existing.affiliateTenant.name}`),
    ];
    const row = await this.prisma.affiliateRelationship.update({
      where: { id },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
        respondedByUserId: userId,
        history,
      },
      include: RELATIONSHIP_INCLUDE,
    });

    const relationship = mapRelationship(row);
    void this.getOwnerRoleEmails(relationship.ownerTenantId)
      .then((emails) =>
        emails.length === 0
          ? undefined
          : this.emailService.send({
              to: emails,
              ...affiliateDeclinedEmail(
                existing.affiliateTenant as unknown as Tenant,
                existing.ownerTenant as unknown as Tenant,
              ),
            }),
      )
      .catch((err) =>
        this.logger.error(`Failed to send affiliate declined email: ${err}`),
      );

    return relationship;
  }

  // Either side can walk away at any time, immediately — no grace period.
  // Terminating removes every listing (cascading collection placements),
  // and notifies whichever side didn't initiate it.
  async terminate(
    id: string,
    callerTenantId: string,
    userId: string,
  ): Promise<AffiliateRelationship> {
    const existing = await this.loadRelationship(id, callerTenantId);
    if (existing.status !== 'ACTIVE') {
      throw new BadRequestException('This relationship is not active.');
    }

    // Every sale through this relationship left a mirror order on the
    // owner's tenant (tenantId + affiliateTenantId together identify it,
    // since a pair can only have one relationship at a time) — don't let
    // either side walk away while one of those is still in progress.
    const openOrder = await this.prisma.order.findFirst({
      where: {
        tenantId: existing.ownerTenantId,
        affiliateTenantId: existing.affiliateTenantId,
        source: 'AFFILIATE',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      select: { id: true },
    });
    if (openOrder) {
      throw new BadRequestException(
        'This relationship has orders still in progress — it can only be ended once every order tied to it is completed or cancelled.',
      );
    }

    const callerIsOwner = existing.ownerTenantId === callerTenantId;
    const callerName = callerIsOwner
      ? existing.ownerTenant.name
      : existing.affiliateTenant.name;

    const history = [
      ...(existing.history as unknown as HistoryEntry[]),
      historyEntry('terminated', `Terminated by ${callerName}`),
    ];

    const [, row] = await this.prisma.$transaction([
      this.prisma.affiliateProductListing.deleteMany({
        where: { relationshipId: id },
      }),
      this.prisma.affiliateRelationship.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          terminatedAt: new Date(),
          terminatedByUserId: userId,
          history,
        },
        include: RELATIONSHIP_INCLUDE,
      }),
    ]);

    const relationship = mapRelationship(row);
    const notifyTenantId = callerIsOwner
      ? relationship.affiliateTenantId
      : relationship.ownerTenantId;
    const otherTenant = callerIsOwner
      ? (existing.affiliateTenant as unknown as Tenant)
      : (existing.ownerTenant as unknown as Tenant);
    void this.getOwnerRoleEmails(notifyTenantId)
      .then((emails) =>
        emails.length === 0
          ? undefined
          : this.emailService.send({
              to: emails,
              ...affiliateTerminatedEmail(callerName, otherTenant),
            }),
      )
      .catch((err) =>
        this.logger.error(`Failed to send affiliate terminated email: ${err}`),
      );

    return relationship;
  }

  async exempt(
    id: string,
    ownerTenantId: string,
    productId: string,
  ): Promise<{ id: string }> {
    const existing = await this.loadRelationship(id, ownerTenantId);
    if (existing.ownerTenantId !== ownerTenantId) {
      throw new ForbiddenException('Only the owner can manage exemptions.');
    }
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: ownerTenantId },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    await this.prisma.$transaction([
      this.prisma.affiliateProductExemption.upsert({
        where: { relationshipId_productId: { relationshipId: id, productId } },
        update: {},
        create: { relationshipId: id, productId },
      }),
      this.prisma.affiliateProductListing.deleteMany({
        where: { relationshipId: id, productId },
      }),
    ]);

    if (existing.status === 'ACTIVE') {
      const history = [
        ...(existing.history as unknown as HistoryEntry[]),
        historyEntry(
          'product_exempted',
          `${product.title} hidden from ${existing.affiliateTenant.name}`,
        ),
      ];
      await this.prisma.affiliateRelationship.update({
        where: { id },
        data: { history },
      });
    }

    return { id: productId };
  }

  async unexempt(
    id: string,
    ownerTenantId: string,
    productId: string,
  ): Promise<{ id: string }> {
    const existing = await this.loadRelationship(id, ownerTenantId);
    if (existing.ownerTenantId !== ownerTenantId) {
      throw new ForbiddenException('Only the owner can manage exemptions.');
    }
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: ownerTenantId },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.affiliateProductExemption.deleteMany({
        where: { relationshipId: id, productId },
      }),
    ];
    if (existing.status === 'ACTIVE') {
      ops.push(
        this.prisma.affiliateProductListing.upsert({
          where: {
            relationshipId_productId: { relationshipId: id, productId },
          },
          update: { isActive: true },
          create: { relationshipId: id, productId },
        }),
      );
    }
    await this.prisma.$transaction(ops);

    if (existing.status === 'ACTIVE') {
      const history = [
        ...(existing.history as unknown as HistoryEntry[]),
        historyEntry(
          'product_unexempted',
          `${product.title} shown to ${existing.affiliateTenant.name} again`,
        ),
      ];
      await this.prisma.affiliateRelationship.update({
        where: { id },
        data: { history },
      });
    }

    return { id: productId };
  }

  // The product-editing-pane version of the same "who can see this"
  // control above — but framed around one product across every affiliate
  // at once, rather than one affiliate across every product. `hiddenFromAll`
  // is the Product-level flag (also gates future affiliates at accept()
  // time); `exemptRelationshipIds` is only meaningful when it's false, and
  // is just the existing per-relationship AffiliateProductExemption model,
  // read back in bulk for this one product.
  async getProductVisibility(
    productId: string,
    ownerTenantId: string,
  ): Promise<{ hiddenFromAll: boolean; exemptRelationshipIds: string[] }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: ownerTenantId },
      select: { hiddenFromAllAffiliates: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const exemptions = await this.prisma.affiliateProductExemption.findMany({
      where: {
        productId,
        relationship: { ownerTenantId, status: 'ACTIVE' },
      },
      select: { relationshipId: true },
    });
    return {
      hiddenFromAll: product.hiddenFromAllAffiliates,
      exemptRelationshipIds: exemptions.map((e) => e.relationshipId),
    };
  }

  // Applies the same exempt()/unexempt() side effects (the exemption
  // marker row, plus deleting/recreating the AffiliateProductListing that
  // actually governs what an affiliate can see) across every one of the
  // owner's active relationships in one transaction, diffed against the
  // requested target set rather than redone unconditionally — so a
  // relationship an affiliate has already customized (isActive, their own
  // markup) isn't disturbed unless its visibility actually changes.
  async setProductVisibility(
    productId: string,
    ownerTenantId: string,
    input: { hiddenFromAll: boolean; exemptRelationshipIds: string[] },
  ): Promise<{ hiddenFromAll: boolean; exemptRelationshipIds: string[] }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: ownerTenantId },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const activeRelationships =
      await this.prisma.affiliateRelationship.findMany({
        where: { ownerTenantId, status: 'ACTIVE' },
        select: { id: true },
      });
    const activeIds = new Set(activeRelationships.map((r) => r.id));

    const targetExemptIds = input.hiddenFromAll
      ? activeIds
      : new Set(input.exemptRelationshipIds.filter((id) => activeIds.has(id)));

    const currentExemptions =
      await this.prisma.affiliateProductExemption.findMany({
        where: { productId, relationshipId: { in: [...activeIds] } },
        select: { relationshipId: true },
      });
    const currentExemptIds = new Set(
      currentExemptions.map((e) => e.relationshipId),
    );

    const toExempt = [...targetExemptIds].filter(
      (id) => !currentExemptIds.has(id),
    );
    const toUnexempt = [...currentExemptIds].filter(
      (id) => !targetExemptIds.has(id),
    );

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { hiddenFromAllAffiliates: input.hiddenFromAll },
      }),
      ...toExempt.flatMap((relationshipId) => [
        this.prisma.affiliateProductExemption.upsert({
          where: { relationshipId_productId: { relationshipId, productId } },
          update: {},
          create: { relationshipId, productId },
        }),
        this.prisma.affiliateProductListing.deleteMany({
          where: { relationshipId, productId },
        }),
      ]),
      ...toUnexempt.flatMap((relationshipId) => [
        this.prisma.affiliateProductExemption.deleteMany({
          where: { relationshipId, productId },
        }),
        this.prisma.affiliateProductListing.upsert({
          where: { relationshipId_productId: { relationshipId, productId } },
          update: { isActive: true },
          create: { relationshipId, productId },
        }),
      ]),
    ]);

    return this.getProductVisibility(productId, ownerTenantId);
  }

  async eligibleProducts(
    id: string,
    ownerTenantId: string,
  ): Promise<AffiliateEligibleProduct[]> {
    const existing = await this.loadRelationship(id, ownerTenantId);
    if (existing.ownerTenantId !== ownerTenantId) {
      throw new ForbiddenException('Only the owner can view this.');
    }
    const [products, exemptions] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId: ownerTenantId },
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.affiliateProductExemption.findMany({
        where: { relationshipId: id },
        select: { productId: true },
      }),
    ]);
    const exemptSet = new Set(exemptions.map((e) => e.productId));
    const withPreorder = await attachPreorderInfo(
      this.prisma,
      ownerTenantId,
      products,
    );
    return withPreorder.map((p) => ({
      product: mapProduct(p, p.preorder),
      exempt: exemptSet.has(p.id),
    }));
  }

  async listings(
    id: string,
    affiliateTenantId: string,
  ): Promise<AffiliateListing[]> {
    const existing = await this.loadRelationship(id, affiliateTenantId);
    if (existing.affiliateTenantId !== affiliateTenantId) {
      throw new ForbiddenException('Only the affiliate can view this.');
    }
    const rows = await this.prisma.affiliateProductListing.findMany({
      where: { relationshipId: id },
      include: { product: true },
      orderBy: { displayOrder: 'asc' },
    });
    const preorderByProductId = await getPreorderInfoMap(
      this.prisma,
      existing.ownerTenantId,
      rows.map((r) => r.productId),
    );
    return rows.map((row) => {
      const ownerPrice = affiliateBasePrice(row.product);
      return {
        id: row.id,
        relationshipId: row.relationshipId,
        productId: row.productId,
        priceOverride: row.priceOverride,
        isActive: row.isActive,
        displayOrder: row.displayOrder,
        product: mapProduct(
          row.product,
          preorderByProductId.get(row.productId) ?? null,
        ),
        ownerPrice,
        effectivePrice: row.priceOverride ?? ownerPrice,
        capCeiling: capCeiling(existing.capType, existing.capValue, ownerPrice),
      };
    });
  }

  // Rejected outright if it breaks the agreed cap or undercuts the owner —
  // never silently clamped here (that's reserved for the owner-price-change
  // cascade below, where there's no explicit new value from a human to
  // reject against).
  async setPrice(
    id: string,
    affiliateTenantId: string,
    productId: string,
    price: number,
  ): Promise<AffiliateListing> {
    const existing = await this.loadRelationship(id, affiliateTenantId);
    if (existing.affiliateTenantId !== affiliateTenantId) {
      throw new ForbiddenException('Only the affiliate can set a price.');
    }
    if (existing.status !== 'ACTIVE') {
      throw new BadRequestException('This relationship is not active.');
    }
    if (!Number.isInteger(price) || price < 0) {
      throw new BadRequestException('Price must be a whole number of GHS.');
    }

    const listing = await this.prisma.affiliateProductListing.findUnique({
      where: { relationshipId_productId: { relationshipId: id, productId } },
      include: { product: true },
    });
    if (!listing) {
      throw new NotFoundException(
        'This product is not listed for this affiliate.',
      );
    }

    const ownerPrice = affiliateBasePrice(listing.product);
    const ceiling = capCeiling(existing.capType, existing.capValue, ownerPrice);
    if (price < ownerPrice) {
      throw new BadRequestException(
        `Your price can't be lower than the owner's price of GHS ${ownerPrice}.`,
      );
    }
    if (price > ceiling) {
      throw new BadRequestException(
        `Your price can't be higher than GHS ${ceiling} — that's the agreed cap on top of the owner's GHS ${ownerPrice}.`,
      );
    }

    const row = await this.prisma.affiliateProductListing.update({
      where: { id: listing.id },
      data: { priceOverride: price },
      include: { product: true },
    });
    return {
      id: row.id,
      relationshipId: row.relationshipId,
      productId: row.productId,
      priceOverride: row.priceOverride,
      isActive: row.isActive,
      displayOrder: row.displayOrder,
      product: mapProduct(row.product),
      ownerPrice,
      effectivePrice: row.priceOverride ?? ownerPrice,
      capCeiling: ceiling,
    };
  }

  async toggleListing(
    id: string,
    affiliateTenantId: string,
    productId: string,
    isActive: boolean,
  ): Promise<{ id: string; isActive: boolean }> {
    const existing = await this.loadRelationship(id, affiliateTenantId);
    if (existing.affiliateTenantId !== affiliateTenantId) {
      throw new ForbiddenException('Only the affiliate can toggle this.');
    }
    const listing = await this.prisma.affiliateProductListing.findUnique({
      where: { relationshipId_productId: { relationshipId: id, productId } },
    });
    if (!listing) {
      throw new NotFoundException(
        'This product is not listed for this affiliate.',
      );
    }
    const row = await this.prisma.affiliateProductListing.update({
      where: { id: listing.id },
      data: { isActive },
    });
    return { id: row.id, isActive: row.isActive };
  }

  async addCollectionItem(
    id: string,
    affiliateTenantId: string,
    collectionId: string,
    productId: string,
  ): Promise<{ id: string }> {
    const existing = await this.loadRelationship(id, affiliateTenantId);
    if (existing.affiliateTenantId !== affiliateTenantId) {
      throw new ForbiddenException(
        'Only the affiliate can place this in a collection.',
      );
    }
    const [listing, collection] = await Promise.all([
      this.prisma.affiliateProductListing.findUnique({
        where: { relationshipId_productId: { relationshipId: id, productId } },
      }),
      this.prisma.collection.findFirst({
        where: { id: collectionId, tenantId: affiliateTenantId },
      }),
    ]);
    if (!listing) {
      throw new NotFoundException(
        'This product is not listed for this affiliate.',
      );
    }
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }

    const maxPosition = await this.prisma.affiliateCollectionItem.aggregate({
      where: { collectionId },
      _max: { position: true },
    });
    const row = await this.prisma.affiliateCollectionItem.upsert({
      where: {
        listingId_collectionId: { listingId: listing.id, collectionId },
      },
      update: {},
      create: {
        listingId: listing.id,
        collectionId,
        position: (maxPosition._max.position ?? -1) + 1,
      },
    });
    return { id: row.id };
  }

  async removeCollectionItem(
    id: string,
    affiliateTenantId: string,
    collectionId: string,
    productId: string,
  ): Promise<{ id: string }> {
    const existing = await this.loadRelationship(id, affiliateTenantId);
    if (existing.affiliateTenantId !== affiliateTenantId) {
      throw new ForbiddenException(
        'Only the affiliate can remove this from a collection.',
      );
    }
    const listing = await this.prisma.affiliateProductListing.findUnique({
      where: { relationshipId_productId: { relationshipId: id, productId } },
    });
    if (!listing) {
      throw new NotFoundException(
        'This product is not listed for this affiliate.',
      );
    }
    await this.prisma.affiliateCollectionItem.deleteMany({
      where: { listingId: listing.id, collectionId },
    });
    return { id: productId };
  }

  // Called fire-and-forget by ProductsService right after an owner's price
  // change is persisted. The owner's price is always the source of truth —
  // a listing with no explicit priceOverride simply floats with it on every
  // read, nothing to do here. One that would now exceed its relationship's
  // cap is clamped straight down to the new ceiling and the affiliate is
  // emailed — never left silently over-cap.
  async recalculateAffiliatePricesForProduct(
    productId: string,
    newOwnerPrice: number,
  ): Promise<void> {
    const listings = await this.prisma.affiliateProductListing.findMany({
      where: { productId, relationship: { status: 'ACTIVE' } },
      include: { relationship: { include: RELATIONSHIP_INCLUDE } },
    });
    const toClamp = listings.filter(
      (l) =>
        l.priceOverride != null &&
        l.priceOverride >
          capCeiling(
            l.relationship.capType,
            l.relationship.capValue,
            newOwnerPrice,
          ),
    );
    if (toClamp.length === 0) return;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) return;
    const mappedProduct = mapProduct(product);

    for (const listing of toClamp) {
      const ceiling = capCeiling(
        listing.relationship.capType,
        listing.relationship.capValue,
        newOwnerPrice,
      );
      const oldPrice = listing.priceOverride as number;
      const relationship = mapRelationship(listing.relationship);
      const history = [
        ...relationship.history,
        historyEntry(
          'price_clamped',
          `${listing.relationship.affiliateTenant.name}'s price was reduced from GHS ${oldPrice} to GHS ${ceiling} after the owner's price changed to GHS ${newOwnerPrice}`,
        ),
      ];

      await this.prisma.$transaction([
        this.prisma.affiliateProductListing.update({
          where: { id: listing.id },
          data: { priceOverride: ceiling },
        }),
        this.prisma.affiliateRelationship.update({
          where: { id: relationship.id },
          data: { history },
        }),
      ]);

      void this.getOwnerRoleEmails(relationship.affiliateTenantId)
        .then((emails) =>
          emails.length === 0
            ? undefined
            : this.emailService.send({
                to: emails,
                ...affiliatePriceClampedEmail(
                  mappedProduct,
                  listing.relationship.ownerTenant as unknown as Tenant,
                  oldPrice,
                  ceiling,
                  listing.relationship.capType,
                  listing.relationship.capValue,
                ),
              }),
        )
        .catch((err) =>
          this.logger.error(
            `Failed to send affiliate price-clamp email: ${err}`,
          ),
        );
    }
  }

  // Storefront merge: every actively-listed owner product an affiliate
  // shows on their own shop, shaped as a Product so it can sit alongside
  // the affiliate's native products in the same list.
  async getActiveListingsForAffiliateTenant(
    affiliateTenantId: string,
  ): Promise<Product[]> {
    const rows = await this.prisma.affiliateProductListing.findMany({
      where: {
        isActive: true,
        relationship: { affiliateTenantId, status: 'ACTIVE' },
      },
      include: {
        product: true,
        relationship: {
          include: {
            ownerTenant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
    const preorderByProductId = await this.preorderMapAcrossOwners(
      rows.map((r) => ({
        productId: r.productId,
        ownerTenantId: r.relationship.ownerTenant.id,
      })),
    );
    return rows.map((row) => ({
      ...mapProduct(
        row.product,
        preorderByProductId.get(row.product.id) ?? null,
      ),
      price: row.priceOverride ?? affiliateBasePrice(row.product),
      affiliateSource: {
        listingId: row.id,
        relationshipId: row.relationshipId,
        ownerTenantId: row.relationship.ownerTenant.id,
        ownerTenantName: row.relationship.ownerTenant.name,
      },
    }));
  }

  // Same merge, scoped to one of the affiliate's own collections.
  async getActiveCollectionItems(collectionId: string): Promise<Product[]> {
    const rows = await this.prisma.affiliateCollectionItem.findMany({
      where: {
        collectionId,
        listing: { isActive: true, relationship: { status: 'ACTIVE' } },
      },
      include: {
        listing: {
          include: {
            product: true,
            relationship: {
              include: {
                ownerTenant: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { position: 'asc' },
    });
    const preorderByProductId = await this.preorderMapAcrossOwners(
      rows.map((r) => ({
        productId: r.listing.product.id,
        ownerTenantId: r.listing.relationship.ownerTenant.id,
      })),
    );
    return rows.map((row) => ({
      ...mapProduct(
        row.listing.product,
        preorderByProductId.get(row.listing.product.id) ?? null,
      ),
      price:
        row.listing.priceOverride ?? affiliateBasePrice(row.listing.product),
      affiliateSource: {
        listingId: row.listing.id,
        relationshipId: row.listing.relationshipId,
        ownerTenantId: row.listing.relationship.ownerTenant.id,
        ownerTenantName: row.listing.relationship.ownerTenant.name,
      },
    }));
  }

  // A single affiliate can resell for several owners at once, each with
  // their own PREORDER collections — group by owner tenant so each gets
  // its own preorder lookup, then merge the results into one map.
  private async preorderMapAcrossOwners(
    items: { productId: string; ownerTenantId: string }[],
  ): Promise<Map<string, PreorderInfo>> {
    const byOwner = new Map<string, string[]>();
    for (const item of items) {
      const list = byOwner.get(item.ownerTenantId) ?? [];
      list.push(item.productId);
      byOwner.set(item.ownerTenantId, list);
    }
    const merged = new Map<string, PreorderInfo>();
    await Promise.all(
      [...byOwner.entries()].map(async ([ownerTenantId, productIds]) => {
        const map = await getPreorderInfoMap(
          this.prisma,
          ownerTenantId,
          productIds,
        );
        for (const [productId, info] of map) merged.set(productId, info);
      }),
    );
    return merged;
  }

  // Public — feeds each tenant's own storefront footer. Every tenant only
  // ever discloses ITS OWN relationships (both directions), gated by its
  // own affiliateDisclosureVisible flag — never the other party's.
  async getPublicSummary(tenantId: string): Promise<{
    sellsFor: { id: string; name: string; slug: string }[];
    resoldBy: { id: string; name: string; slug: string }[];
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { affiliateDisclosureVisible: true },
    });
    if (!tenant?.affiliateDisclosureVisible) {
      return { sellsFor: [], resoldBy: [] };
    }
    const [asAffiliate, asOwner] = await Promise.all([
      this.prisma.affiliateRelationship.findMany({
        where: { affiliateTenantId: tenantId, status: 'ACTIVE' },
        select: {
          ownerTenant: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.affiliateRelationship.findMany({
        where: { ownerTenantId: tenantId, status: 'ACTIVE' },
        select: {
          affiliateTenant: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);
    return {
      sellsFor: asAffiliate.map((r) => r.ownerTenant),
      resoldBy: asOwner.map((r) => r.affiliateTenant),
    };
  }

  // Used by OrdersService.create to resolve a cart line item that isn't a
  // native product for the buying tenant — priced at the affiliate's live
  // effective price, same "price at order time, never trust the client"
  // principle already used for native products.
  async resolveOrderableListing(
    productId: string,
    affiliateTenantId: string,
  ): Promise<{
    product: Product;
    listingId: string;
    effectivePrice: number;
    relationship: AffiliateRelationship;
  } | null> {
    const row = await this.prisma.affiliateProductListing.findFirst({
      where: {
        productId,
        isActive: true,
        relationship: { affiliateTenantId, status: 'ACTIVE' },
      },
      include: {
        product: true,
        relationship: { include: RELATIONSHIP_INCLUDE },
      },
    });
    if (!row) return null;
    const [preorder] = await attachPreorderInfo(
      this.prisma,
      row.relationship.ownerTenantId,
      [row.product],
    );
    return {
      product: mapProduct(row.product, preorder.preorder),
      listingId: row.id,
      effectivePrice: row.priceOverride ?? affiliateBasePrice(row.product),
      relationship: mapRelationship(row.relationship),
    };
  }
}
