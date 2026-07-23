# Selltns — Multi-Tenant Ecommerce Platform Spec

## 1. Architecture Overview

**Model:** Single platform, multi-tenant. One Next.js frontend + one NestJS API serve all tenants (stores). Tenant is resolved per-request and scopes every query.

**Domain routing (canonical URL rules):**
- Every store gets a subdomain on creation: `business-name.selltns.com` — this is canonical and indexable by default.
- Custom domain is an upgrade path: once a store connects and verifies a domain (CNAME to Vercel), that domain becomes canonical. The subdomain then 301-redirects to it — no duplicate content, no split SEO authority.
- `selltns.com/business-name/...` is **not** a public storefront URL. It's used internally as a preview/share link before a store has a subdomain confirmed live, or for admin preview mode. It redirects to the real canonical URL once one exists.
- Tenant resolution middleware (Next middleware + Nest guard) reads `Host` header → looks up tenant by subdomain or custom domain → attaches `tenantId` to the request context. Falls back to path param only in preview mode.

**Frontend/Backend split:**
- Next.js (App Router) — storefronts (SSR/ISR for SEO) + admin dashboard (client-heavy, behind auth).
- NestJS + Prisma + Postgres — single source of truth API, JWT-based auth, so any future client (mobile app, another frontend) can authenticate and hit the same endpoints.
- Auth flow: Google OAuth handled via NestJS (Passport strategy) issuing JWT (access + refresh). Next.js never talks to Google directly — it calls the API, which keeps auth portable across future clients.

**Hosting:**
- Frontend → Vercel (edge network, ISR, great for SEO + global storefront latency).
- Backend + Postgres → Railway (simple multi-service deploys, managed Postgres, easy Prisma migrations).
- Media (product photos, gallery) → S3-compatible storage (Cloudflare R2 recommended — no egress fees, works cleanly with Vercel).

**Multi-tenancy at the data layer:** shared database, shared schema, `tenantId` foreign key on every tenant-owned table, enforced via Prisma middleware so no query can accidentally cross tenants.

---

## 2. Data Model (core entities)

```
Tenant (Store)
  id, name, slug (subdomain), customDomain, domainVerified,
  themeId, themeTokens (jsonb overrides), createdAt

User
  id, email, name, googleId, createdAt
  → TenantMembership[] (many-to-many: a user can belong to multiple tenants)

TenantMembership
  userId, tenantId, role (OWNER | MANAGER | STAFF), invitedAt, acceptedAt

MediaAsset (Gallery)
  id, tenantId, url, thumbUrl, altText, uploadedAt

Product
  id, tenantId, title, description, price, sku, stock,
  isActive (shop toggle), images[] (MediaAsset refs), createdAt

Collection
  id, tenantId, title, slug, description, themeOverrideId (optional),
  seoTitle, seoDescription, products[] (many-to-many via CollectionProduct)

PaymentMethod
  id, tenantId, type (MOMO | BANK), details (jsonb, encrypted),
  isEnabled, isPreferred

Order (Booking)
  id, tenantId, customerId (nullable), guestContact (jsonb),
  status (PENDING | CONFIRMED | MODIFIED | CANCELLED | COMPLETED),
  items[] (OrderItem), total, trackingToken (public link),
  createdAt, confirmedAt

OrderItem
  orderId, productId, quantity, priceAtOrder

Customer (optional Google-auth'd shopper)
  id, googleId, email, name, tenantId? (or global — see note below)
```

Note: customers authenticating via Google — I'd keep customer identity **global** (one account across all stores on the platform, like a marketplace account), with per-tenant order history. Simpler UX: a shopper doesn't need a new Google login per store.

---

## 3. Admin Features

**Roles:** OWNER (full control incl. billing/domain), MANAGER (products, orders, collections, payment methods), STAFF (orders + product edits, no payment/domain settings). Invite by email → they accept via Google auth → `TenantMembership` created.

**3.1 Gallery** — any photo uploaded anywhere in the admin (product creation, collection cover, etc.) lands in a central per-tenant gallery. Gallery is the single picker used everywhere images are needed.

**3.2 Products** — standard fields (title, description, price, SKU, stock, images from gallery or new upload). `isActive` toggle controls storefront visibility without deleting the product.

**3.3 Collections** — curated product sets, each with its own slug, SEO title/description, and optional theme override (a collection can look different from the main shop). This is what makes a collection "its own shop."

**3.4 Storefront themes** — 3 starter templates (Fashion, General Purpose, Clean/Porsche-minimal), selectable per store or per collection. Every theme reads from a shared design-token schema (colors, fonts, spacing scale) so switching themes never breaks a store's branding.

**3.5 Payment options** — a store can add multiple MOMO/Bank entries, toggle which show to customers, and mark one "preferred" (visually emphasized on the payment page — Linktree-for-payments UX).

---

## 4. Customer / Storefront Features

**4.1 Browsing & cart** — no login required. Cart persists client-side (and to `Customer` if signed in), auto-updates on add/remove.

**4.2 Checkout is a booking, not a payment** — flow:
1. Customer reviews cart total → confirms booking (no payment yet).
2. Order created as `PENDING`, gets a `trackingToken` → unique tracking URL.
3. Admin(s) notified (email + optional SMS) of new booking.
4. Admin confirms (or modifies) the order in dashboard.
5. On confirm, customer notified (email/SMS) — payment page (their preferred + enabled methods) becomes accessible via the tracking link.
6. If admin modifies the order, customer is notified and sees the change on the same tracking page.
7. Customer can always download a PDF order booklet at any stage.
8. "Share to WhatsApp" button generates a link with Open Graph meta tags (order summary, total, store name) so it unfurls nicely in WhatsApp — points admin to the tracking URL.

The tracking URL (`/track/{trackingToken}`) is the customer's persistent way back into their order — no login needed, token is the access key.

---

## 5. Theming System

- Design tokens (not hardcoded colors) drive every themeable surface: primary/secondary/accent colors, font pairing, corner radius, spacing density.
- Stored as `themeTokens` jsonb on Tenant (and optional override on Collection), consumed via CSS variables at render time — same 3 base templates, infinite palettes.
- Future: themes become purchasable/ownable SKUs (a `TenantThemeOwnership` join table gates which templates a tenant can select) — data model already supports this by keeping `themeId` decoupled from a hardcoded enum.

---

## 6. Landing / "How I Did That" Page

- Separate from the storefront — a per-tenant opt-in marketing page (`business-name.selltns.com` root or `/about`, configurable) showcasing embedded Instagram/TikTok/YouTube content, brand story, etc.
- Purely presentational, theme-aware, no ecommerce logic — a content block system (video embed, text, image gallery blocks) admin can arrange.

---

## 7. Tech Stack & Non-Functionals

**Stack:** Next.js (App Router) + Tailwind + shadcn/ui · NestJS + Prisma + Postgres · Cloudflare R2 (media) · Vercel + Railway.

**Performance/UX rules:**
- No blur effects anywhere (backdrop-blur, frosted glass) — solid surfaces + shadows/borders only, keeps low-end devices smooth.
- Mobile-first for both storefront and admin — an admin should fully manage products/orders from a phone browser with no compromised UX.
- Images served via next/image + R2, responsive `srcset`, lazy-loaded below the fold.

**SEO checklist (baked into architecture, not bolted on):**
- SSR/ISR per store and per collection page (no client-only rendering for public pages).
- Per-collection and per-product meta title/description, OG tags, JSON-LD (Product, Offer schema).
- Canonical tags pointing to the live domain (subdomain or custom, whichever is current).
- Sitemap + robots.txt generated per tenant domain.
- Clean, human-readable slugs everywhere (products, collections, tenants).

---

**Open items for later phases:** payment processing/settlement (flagged as future by you), theme marketplace billing, SMS provider choice (Twilio vs. local Ghana MOMO-adjacent SMS gateway — worth a decision when we get there).
