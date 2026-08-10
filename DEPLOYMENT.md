# Deploying Selltns

Two services, deployed separately: **apps/api** (NestJS + Postgres) → Railway,
**apps/web** (Next.js) → Vercel. Deploy the API first — the web app needs a
live API URL before its own env vars make sense.

## Accounts you'll need

- [Railway](https://railway.app) — API + Postgres
- [Vercel](https://vercel.com) — web app
- [Cloudflare](https://dash.cloudflare.com) (R2) — **two** buckets: one public
  (product/collection/story media), one **not** public (vendor verification
  documents — Ghana Card scans, selfies — must never get a public custom
  domain attached, see `R2_PRIVATE_BUCKET_NAME` in `.env.example`)
- [Brevo](https://www.brevo.com) — transactional email (order/invite/verification notifications)
- A [Firebase](https://console.firebase.google.com) project — Google sign-in for both `/admin` and `/superadmin`
- Optional but recommended: [Sentry](https://sentry.io) (error tracking), [PostHog](https://posthog.com) (analytics)

Every optional integration above degrades gracefully when unset (falls back to
disk/console/no-op) — see the comments in each `.env.example` for exactly what
happens without it. None of them block a first deploy; add them whenever.

---

## 1. API + database (Railway)

1. New Railway project → **Add a Postgres database** (gives you `DATABASE_URL`
   automatically as a reference variable).
2. **New service → Deploy from GitHub repo** → select this repo. In the
   service's Settings, set **Root Directory** to `apps/api` (Railway's
   monorepo support builds/runs just that directory).
3. Build command: `npm install && npx prisma generate && npm run build`
   Start command: `npx prisma migrate deploy && npm run start:prod`
   (`migrate deploy` applies pending migrations before the app starts —
   safe to run on every deploy, it's a no-op when nothing's pending.)
4. Set env vars from `apps/api/.env.example`. `DATABASE_URL` — reference the
   Postgres plugin's variable instead of typing it. `PORT` — leave unset;
   Railway injects its own and `main.ts` already reads `process.env.PORT`.
   `WEB_ORIGIN` only affects links inside emails (order tracking, invites) —
   not CORS, which allows any origin (see `src/main.ts`) — so it's fine to
   set this whenever you have the real Vercel URL, no rush.
5. Once deployed, note the public URL Railway gives the service (Settings →
   Networking → Generate Domain, or attach a custom subdomain like
   `api.yourdomain.com`) — this is `NEXT_PUBLIC_API_URL` for the web app.
6. **Bootstrap the first superadmin** — a required step, not optional/demo
   data: without it nobody can ever sign in to `/superadmin` (self-registration
   is deliberately blocked). Once, right after the first successful deploy,
   run `npm run bootstrap:superadmin` against the production service — e.g.
   `railway run --service <api-service-name> npm run bootstrap:superadmin`
   from your machine, or via the Railway dashboard's one-off command runner.
   This is unrelated to `prisma db seed` (that command is demo/dev fixture
   data only — see step below — and shouldn't be run against production at
   all). Safe to re-run any time; it's an idempotent upsert.
7. The API root (`/`) is now a branded landing page, and `/health` is a
   live status page — real checks (DB query, R2 HeadBucket, Brevo account
   auth, Vercel project auth), not just "is the env var set." Good for a
   glance after any deploy; also returns JSON via `Accept: application/json`
   for an uptime monitor. **Don't** wire this up as Railway's own health
   check target — it round-trips to third-party APIs with a 3s timeout
   each, so a Brevo/Vercel blip could make Railway think the whole app is
   down and restart it. It's a diagnostic page for humans, not a liveness
   probe.

## 2. Supporting services

Follow the numbered instructions in each `.env.example` comment block — they're
written to be followed in order (R2 bucket → API token → public domain; Brevo
API key → verified sender; Firebase service account → web app config). Nothing
here is Vercel/Railway-specific, do this whenever's convenient.

## 3. Web app (Vercel)

1. **Import Project** from this repo. In **Root Directory**, select `apps/web`
   — Vercel auto-detects Next.js and handles the npm workspaces install from
   the monorepo root correctly once Root Directory is set.
2. Set env vars from `apps/web/.env.local.example`. Key ones for a first
   deploy: `NEXT_PUBLIC_API_URL` (the Railway URL from step 1),
   `NEXT_PUBLIC_SITE_URL` (leave as the `*.vercel.app` URL Vercel assigns
   until you add a custom domain — see step 4), `NEXT_PUBLIC_APP_DOMAIN`
   (same — update once you have a real domain), plus the Firebase web config.
3. Deploy. You'll get a working app at `<project>.vercel.app` — the
   storefront and admin both work, but Google sign-in won't yet (next step).

## 4. Custom domain + tying the two services together

Do this once you have a real production domain (e.g. `selltns.com`):

1. **Vercel** → Project Settings → Domains → add it. Vercel shows the exact
   A/CNAME records to add at your registrar.
2. Update on Vercel: `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_DOMAIN` to
   the real domain, then redeploy (env var changes need a redeploy to take
   effect on already-built pages).
3. Update on Railway: `WEB_ORIGIN` to `https://yourdomain.com` (used in email
   links only — CORS itself already allows any origin, so nothing else to
   change here for custom domains to work).
4. **Firebase Console** → Authentication → Settings → Authorized domains →
   add your production domain. Google sign-in silently fails on any domain
   not in this list — easy to miss, this is the #1 "login button does
   nothing in production" cause. One domain covers both `/admin/login` and
   `/superadmin/login` — same Firebase project, same web config.
5. **Vendor custom domains** (optional, can wait): once you have
   `PLATFORM_APEX_IP`/`PLATFORM_CNAME_TARGET` (shown on Vercel's "add a
   domain" screen — add any placeholder domain there once to see them) and a
   Vercel API token (vercel.com/account/tokens) + your Vercel Project ID
   (Settings → General), set those on Railway. Without them, custom-domain
   verification still works via plain DNS lookup — vendors just don't get
   automatic TLS provisioning through the Vercel API.

## Note: the build number in the footer

Every footer shows `v{package.json version} · build {N}`, where `N` is the
total git commit count (`git rev-list --count HEAD`), resolved at build time
in `apps/web/next.config.ts`. If Vercel ever does a shallow clone for a
build, that count would undercount rather than error — the footer would just
show a smaller number than expected, nothing breaks. Worth a glance after
the first deploy; if the number looks wrong, it's cosmetic only.

## Post-deploy smoke test

- [ ] `https://yourdomain.com` loads the landing page
- [ ] `https://api.yourdomain.com` loads the API's own landing page (not a 404/plain text)
- [ ] `https://api.yourdomain.com/health` shows "All systems operational" —
      if anything shows a warning, that fallback is expected in dev but
      shouldn't be there in production (e.g. R2/Brevo not configured)
- [ ] `https://yourdomain.com/akosua` (or your seeded/real tenant) loads a storefront
- [ ] `/admin/login` → Google sign-in succeeds and lands in the dashboard
- [ ] Create a product, place a test order, confirm it in admin, check the tracking link
- [ ] `/sitemap.xml` and `/robots.txt` resolve and list real tenant URLs
- [ ] `/privacy` loads
- [ ] `/superadmin/login` → sign in with `mrfimpong@gmail.com` (after the
      bootstrap step above) → lands in the superadmin overview
- [ ] Submit a test verification from `/admin/verification` on a real store,
      approve it from `/superadmin/verifications`, confirm the Verified badge
      shows on that store's `/pay` page and the ID photo actually renders in
      the superadmin review view (confirms the private R2 bucket is wired
      correctly, not falling back to local disk)
- [ ] If Sentry is configured: trigger a deliberate error, confirm it shows up in the dashboard
