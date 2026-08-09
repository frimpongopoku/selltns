import './instrument';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

function checkRequiredEnv() {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || process.env[key] === 'CHANGE_ME',
  );
  if (missing.length > 0) {
    console.error(
      `Missing or unset environment variable(s): ${missing.join(', ')}.\n` +
        'Copy apps/api/.env.example to apps/api/.env and fill in real values before starting the API.',
    );
    process.exit(1);
  }
}

async function bootstrap() {
  checkRequiredEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // No fetch in apps/web ever sets `credentials: "include"` — admin calls
  // go through the web app's same-origin proxy (server-to-server, not
  // subject to CORS) using a Bearer header, not cookies. So the only
  // requests a browser makes directly, cross-origin, to this API are
  // public/unauthenticated storefront calls (cart, checkout, tracking, the
  // support form) — safe to allow from any origin, which is what makes a
  // vendor's custom domain work for those too, not just the platform
  // domain. `credentials: true` is deliberately NOT set (incompatible with
  // allowing any origin, and nothing here relies on cross-origin cookies).
  app.enableCors({ origin: true });
  // Only used when R2 env vars are absent and MediaModule falls back to disk
  // storage for local dev — see media/storage/local-disk-storage.service.ts.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  await app.listen(process.env.PORT ?? 4311);
}
bootstrap();
