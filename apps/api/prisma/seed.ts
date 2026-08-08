import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  tenant,
  teamMembers,
  products,
  collections,
  paymentMethods,
  orders,
  storyBlocks,
} from '../src/common/seed-data';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const seededTenant = await prisma.tenant.upsert({
    where: { id: tenant.id },
    update: { whatsappNumber: tenant.whatsappNumber },
    create: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      customDomain: tenant.customDomain,
      domainVerified: tenant.domainVerified,
      whatsappNumber: tenant.whatsappNumber,
      themeTokens: tenant.themeTokens as object,
      storyBlocks: storyBlocks as object,
      createdAt: new Date(tenant.createdAt),
    },
  });

  for (const member of teamMembers) {
    const email = member.email.toLowerCase();
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: member.name,
        createdAt: new Date(member.invitedAt),
      },
    });

    await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: { tenantId: seededTenant.id, userId: user.id },
      },
      update: {},
      create: {
        tenantId: seededTenant.id,
        userId: user.id,
        role: member.role,
        invitedAt: new Date(member.invitedAt),
        acceptedAt: member.acceptedAt ? new Date(member.acceptedAt) : null,
      },
    });
  }

  for (const product of products) {
    const data = {
      title: product.title,
      slug: product.slug,
      description: product.description,
      price: product.price,
      sku: product.sku,
      stock: product.stock,
      isActive: product.isActive,
      images: product.images,
      tags: product.tags,
      displayOrder: product.displayOrder,
    };
    await prisma.product.upsert({
      where: { id: product.id },
      update: data,
      create: {
        id: product.id,
        tenantId: seededTenant.id,
        ...data,
        createdAt: new Date(product.createdAt),
      },
    });
  }

  for (const collection of collections) {
    const collectionData = {
      title: collection.title,
      slug: collection.slug,
      description: collection.description,
      coverImage: collection.coverImage,
      seoTitle: collection.seoTitle,
      seoDescription: collection.seoDescription,
      tags: collection.tags,
      themeOverride: collection.themeOverride as object | undefined,
      type: collection.type,
      depositType: collection.depositType,
      depositPercentage: collection.depositPercentage,
      fulfillmentNote: collection.fulfillmentNote,
    };
    await prisma.collection.upsert({
      where: { id: collection.id },
      update: collectionData,
      create: {
        id: collection.id,
        tenantId: seededTenant.id,
        ...collectionData,
      },
    });

    for (const [position, productId] of collection.productIds.entries()) {
      await prisma.collectionProduct.upsert({
        where: {
          collectionId_productId: { collectionId: collection.id, productId },
        },
        update: { position },
        create: { collectionId: collection.id, productId, position },
      });
    }
  }

  for (const method of paymentMethods) {
    const methodData = {
      type: method.type,
      label: method.label,
      details: method.details,
      isEnabled: method.isEnabled,
      isPreferred: method.isPreferred,
    };
    await prisma.paymentMethod.upsert({
      where: { id: method.id },
      update: methodData,
      create: {
        id: method.id,
        tenantId: seededTenant.id,
        ...methodData,
      },
    });
  }

  for (const order of orders) {
    const orderData = {
      customerName: order.customerName,
      customerContact: order.customerContact,
      customerEmail: order.customerEmail,
      status: order.status,
      items: order.items as unknown as Prisma.InputJsonValue,
      total: order.total,
      trackingToken: order.trackingToken,
      paymentReference: order.paymentReference,
      history: order.history as unknown as Prisma.InputJsonValue,
      confirmedAt: order.confirmedAt ? new Date(order.confirmedAt) : null,
      seenByAdminAt: order.seenByAdminAt ? new Date(order.seenByAdminAt) : null,
      type: order.type,
      depositType: order.depositType,
      depositPercentage: order.depositPercentage,
      depositAmount: order.depositAmount,
      balanceAmount: order.balanceAmount,
      balancePaid: order.balancePaid,
      balancePaidAt: order.balancePaidAt ? new Date(order.balancePaidAt) : null,
      balanceRequestedAt: order.balanceRequestedAt
        ? new Date(order.balanceRequestedAt)
        : null,
      whatsappNumber: order.whatsappNumber,
      deliveryAddress: order.deliveryAddress,
    };
    await prisma.order.upsert({
      where: { id: order.id },
      update: orderData,
      create: {
        id: order.id,
        tenantId: seededTenant.id,
        ...orderData,
        createdAt: new Date(order.createdAt),
      },
    });
  }

  console.log(
    `Seeded tenant "${seededTenant.name}" (${seededTenant.slug}) with ${teamMembers.length} members.`,
  );
  console.log(
    `Seeded ${products.length} products, ${collections.length} collections, ${paymentMethods.length} payment methods, and ${orders.length} orders.`,
  );
  console.log(
    'NOTE: seeded member emails are fake *.test addresses and cannot sign in with a real Google account. ' +
      "To test the allowlist-hit login path end to end, update one membership's user email in Postgres " +
      'to a real Gmail address you control, e.g.:\n' +
      "  UPDATE users SET email = 'you@gmail.com' WHERE email = '" +
      teamMembers[0].email.toLowerCase() +
      "';",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
