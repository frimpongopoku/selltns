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
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:4310',
    credentials: true,
  });
  // Only used when R2 env vars are absent and MediaModule falls back to disk
  // storage for local dev — see media/storage/local-disk-storage.service.ts.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  await app.listen(process.env.PORT ?? 4311);
}
bootstrap();
