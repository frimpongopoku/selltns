// Imported first, before anything else — see main.ts. Sentry needs to
// patch modules (http, pg, etc.) before the rest of the app requires them
// for auto-instrumentation to work.
import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// With SENTRY_DSN unset, Sentry.init() no-ops — same "unset = fine for
// local dev, required for production" convention used for R2/Brevo/Vercel
// elsewhere in this API (see main.ts's checkRequiredEnv, media.module.ts,
// email.module.ts, domains.module.ts).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
