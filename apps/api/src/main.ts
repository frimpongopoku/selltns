import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
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
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:4310',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 4311);
}
bootstrap();
