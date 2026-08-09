# Selltns

Multi-tenant storefront platform for Ghanaian sellers — set up a store, share
one link, get paid by Mobile Money or bank. See `selltns-spec.md` for the
full architecture writeup.

## Structure

```
apps/
  web/   Next.js 16 (App Router) — storefront + admin dashboard, deploys to Vercel
  api/   NestJS + Prisma/Postgres — the API, deploys to Railway
```

Real Postgres (via Prisma), real Google auth (Firebase), role-based admin
access (OWNER/MANAGER/STAFF), Cloudflare R2 media storage, Brevo transactional
email, Sentry error tracking, and PostHog analytics — all wired up, each
degrading gracefully to a local/disk/no-op fallback when its env vars aren't
set. See each `.env.example` for exactly what needs configuring and what
happens without it.

## Ports

Chosen to avoid clashing with other local projects:

- **web** → http://localhost:4310
- **api** → http://localhost:4311

Configured in `apps/web/package.json` (`next dev -p 4310`) and
`apps/api/src/main.ts` (`PORT` env var, defaults to 4311).

## Running locally

This is an npm workspaces monorepo (root `package.json` lists `apps/*` as
workspaces) — one `npm install` at the root installs both apps.

```bash
npm install
cp apps/api/.env.example apps/api/.env         # fill in real values
cp apps/web/.env.local.example apps/web/.env.local
npm run dev            # runs both apps together
# or individually:
npm run dev:web
npm run dev:api
```

Then open:
- Storefront: http://localhost:4310
- Admin: http://localhost:4310/admin

The API needs a local Postgres database (`DATABASE_URL` in `apps/api/.env`) —
run `npx prisma migrate dev` from `apps/api` to set up the schema, and
`npx prisma db seed` to load a demo tenant ("Akosua & Co.") with products,
collections, orders, gallery images, and payment methods
(`apps/api/src/common/seed-data.ts`).

## Deploying

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full runbook (Railway for the
API + Postgres, Vercel for the web app, and the order to do it in).

## Notes

- The storefront theme is token-driven (`ThemeTokens`) with 3 starter
  templates — Fashion, General Purpose, Clean/Minimal — picked in
  `/admin/settings/theme`. A collection can override its own theme.
- The order flow (`/checkout` → `/track/[token]`) is a booking, not a
  payment: no payment at checkout, order goes `PENDING`, and payment methods
  only appear on the tracking page once an admin confirms the order.
- Admin access is role-gated (OWNER/MANAGER/STAFF) both on the API (real
  guards, not just hidden UI) and in the admin nav/pages.
