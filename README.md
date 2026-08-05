# Selltns — prototype monorepo

Design-review build: full click-through prototype of the storefront + admin,
wired to a mock in-memory API. No real database, auth, or payments yet — see
`selltns-spec.md` for the target architecture.

## Structure

```
apps/
  web/   Next.js 16 (App Router) — storefront + admin dashboard
  api/   NestJS — mock REST API, in-memory fixtures (resets on restart)
```

## Ports

Chosen to avoid clashing with other local projects (3000/3001 were already in use):

- **web** → http://localhost:4310
- **api** → http://localhost:4311

Configured in `apps/web/package.json` (`next dev -p 4310`) and
`apps/api/src/main.ts` (`PORT` env var, defaults to 4311).

## Running

This is an npm workspaces monorepo (root `package.json` lists `apps/*` as
workspaces) — one `npm install` at the root installs both apps.

```bash
npm install
npm run dev            # runs both apps together
# or individually:
npm run dev:web
npm run dev:api
```

Then open:
- Storefront: http://localhost:4310
- Admin: http://localhost:4310/admin (mock Google login at `/admin/login`, any click signs in)

## Notes on the mock data layer

- The API seeds one demo tenant ("Akosua & Co.") with products, collections,
  orders, gallery images, payment methods and team members in
  `apps/api/src/common/seed-data.ts`. All mutations are in-memory and reset
  when the API restarts.
- The storefront theme is token-driven (`ThemeTokens`) with 3 starter
  templates — Fashion, General Purpose, Clean/Minimal — picked in
  `/admin/settings/theme`. The "Minimal Edit" collection demonstrates a
  per-collection theme override.
- The order request flow (`/checkout` → `/track/[token]`) mirrors the spec:
  no payment at checkout, order goes `PENDING`, and payment methods only
  appear on the tracking page once an admin confirms the order.
