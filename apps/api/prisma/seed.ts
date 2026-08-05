import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { tenant, teamMembers, products, collections } from '../src/common/seed-data';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const seededTenant = await prisma.tenant.upsert({
    where: { id: tenant.id },
    update: {},
    create: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      customDomain: tenant.customDomain,
      domainVerified: tenant.domainVerified,
      themeTokens: tenant.themeTokens as object,
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
      where: { tenantId_userId: { tenantId: seededTenant.id, userId: user.id } },
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
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: product.id,
        tenantId: seededTenant.id,
        title: product.title,
        slug: product.slug,
        description: product.description,
        price: product.price,
        sku: product.sku,
        stock: product.stock,
        isActive: product.isActive,
        images: product.images,
        displayOrder: product.displayOrder,
        createdAt: new Date(product.createdAt),
      },
    });
  }

  for (const collection of collections) {
    await prisma.collection.upsert({
      where: { id: collection.id },
      update: {},
      create: {
        id: collection.id,
        tenantId: seededTenant.id,
        title: collection.title,
        slug: collection.slug,
        description: collection.description,
        coverImage: collection.coverImage,
        seoTitle: collection.seoTitle,
        seoDescription: collection.seoDescription,
        themeOverride: collection.themeOverride as object | undefined,
      },
    });

    for (const [position, productId] of collection.productIds.entries()) {
      await prisma.collectionProduct.upsert({
        where: { collectionId_productId: { collectionId: collection.id, productId } },
        update: { position },
        create: { collectionId: collection.id, productId, position },
      });
    }
  }

  console.log(`Seeded tenant "${seededTenant.name}" (${seededTenant.slug}) with ${teamMembers.length} members.`);
  console.log(`Seeded ${products.length} products and ${collections.length} collections.`);
  console.log(
    'NOTE: seeded member emails are fake *.test addresses and cannot sign in with a real Google account. ' +
      'To test the allowlist-hit login path end to end, update one membership\'s user email in Postgres ' +
      'to a real Gmail address you control, e.g.:\n' +
      '  UPDATE users SET email = \'you@gmail.com\' WHERE email = \'' +
      teamMembers[0].email.toLowerCase() +
      '\';',
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
