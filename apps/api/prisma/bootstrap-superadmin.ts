// Crucial one-time bootstrap, NOT demo/seed data — this is the only way
// anyone ever gets into /superadmin, since self-registration is
// deliberately blocked (see superadmin/superadmin-session.guard.ts). Run
// via `npm run bootstrap:superadmin`, independent of `prisma db seed` and
// its demo fixtures (see prisma/seed.ts) — safe and expected to run in
// every environment, including production, right after the first deploy.
// Idempotent: safe to re-run any time.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const FIRST_SUPERADMIN_EMAIL = 'mrfimpong@gmail.com';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: FIRST_SUPERADMIN_EMAIL },
    update: {},
    create: { email: FIRST_SUPERADMIN_EMAIL },
  });
  console.log(`Superadmin ready: ${superAdmin.email}`);
  console.log(
    'They can now sign in at /superadmin/login and invite others from /superadmin/admins.',
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
