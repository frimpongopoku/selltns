import * as Sentry from "@sentry/nextjs";

// Server-side (Node + Edge runtime) error tracking. Reuses the public DSN
// var (Sentry DSNs aren't secret — that's why the client SDK embeds them
// directly) so one Sentry project config covers both sides of this app.
// With it unset, Sentry.init() no-ops — same "unset = fine for local dev,
// required for production" convention used for R2/Brevo/Vercel elsewhere.
export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Off by default — costs a Sentry quota line item and this app has no
    // session-replay use case server-side; flip on if that changes.
  });
}

export const onRequestError = Sentry.captureRequestError;
