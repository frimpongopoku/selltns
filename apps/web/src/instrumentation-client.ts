import * as Sentry from "@sentry/nextjs";

// Client-side (browser) error tracking — see src/instrumentation.ts for
// the server-side half. Runs for both the storefront and the admin
// dashboard; user/tenant context is attached separately (see
// app/[slug]/layout.tsx and app/admin/(dashboard)/layout.tsx) once the
// tenant/session is known, so errors can be traced back to who hit them.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
