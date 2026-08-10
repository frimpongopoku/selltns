import { Injectable } from '@nestjs/common';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getApps } from 'firebase-admin/app';
import { PrismaService } from '../prisma/prisma.service';

export type CheckStatus = 'ok' | 'warn' | 'error';

export interface HealthCheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
  ms: number;
}

const CHECK_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

type CheckOutcome = { status: CheckStatus; detail: string };

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async runChecks(): Promise<HealthCheckResult[]> {
    const checks: [string, () => Promise<CheckOutcome> | CheckOutcome][] = [
      ['Database (Postgres)', () => this.checkDatabase()],
      ['Product media storage (R2)', () => this.checkR2(false)],
      ['Verification document storage (R2)', () => this.checkR2(true)],
      ['Transactional email (Brevo)', () => this.checkBrevo()],
      ['Google sign-in (Firebase)', () => this.checkFirebase()],
      ['Custom domains (Vercel)', () => this.checkVercel()],
      ['Error tracking (Sentry)', () => this.checkSentry()],
    ];

    return Promise.all(
      checks.map(async ([name, run]) => {
        const start = Date.now();
        try {
          const outcome = await run();
          return { name, ...outcome, ms: Date.now() - start };
        } catch (err) {
          return {
            name,
            status: 'error' as const,
            detail: errorMessage(err),
            ms: Date.now() - start,
          };
        }
      }),
    );
  }

  private async checkDatabase(): Promise<CheckOutcome> {
    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS);
      return { status: 'ok', detail: 'Connected' };
    } catch (err) {
      return { status: 'error', detail: `Unreachable — ${errorMessage(err)}` };
    }
  }

  // Shared by both the public product-media bucket and the private
  // verification-document bucket — same live check (HeadBucket), different
  // env vars per media/storage/*.service.ts's own conditions.
  private async checkR2(isPrivate: boolean): Promise<CheckOutcome> {
    const bucket = isPrivate
      ? process.env.R2_PRIVATE_BUCKET_NAME
      : process.env.R2_BUCKET_NAME;
    const hasConfig =
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      bucket;

    if (!hasConfig) {
      return {
        status: 'warn',
        detail: 'Not configured — falling back to local disk (fine for dev, not production)',
      };
    }

    try {
      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
        },
      });
      await withTimeout(
        client.send(new HeadBucketCommand({ Bucket: bucket })),
        CHECK_TIMEOUT_MS,
      );
      return { status: 'ok', detail: `Reachable (${bucket})` };
    } catch (err) {
      return {
        status: 'error',
        detail: `Configured but unreachable — ${errorMessage(err)}`,
      };
    }
  }

  private async checkBrevo(): Promise<CheckOutcome> {
    if (!process.env.BREVO_API_KEY) {
      return {
        status: 'warn',
        detail: 'Not configured — writing emails to disk (fine for dev, not production)',
      };
    }
    try {
      const res = await withTimeout(
        fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': process.env.BREVO_API_KEY },
        }),
        CHECK_TIMEOUT_MS,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { status: 'ok', detail: 'Authenticated' };
    } catch (err) {
      return {
        status: 'error',
        detail: `Configured but failing — ${errorMessage(err)}`,
      };
    }
  }

  // FIREBASE_* are required at boot (see main.ts's checkRequiredEnv) — this
  // is a structural check (the SDK app object exists) rather than a live
  // network round-trip, since verifying a real Google ID token needs one we
  // don't have.
  private checkFirebase(): CheckOutcome {
    return getApps().length > 0
      ? { status: 'ok', detail: 'Initialized' }
      : { status: 'error', detail: 'Not initialized' };
  }

  private async checkVercel(): Promise<CheckOutcome> {
    if (!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID)) {
      return {
        status: 'warn',
        detail: 'Not configured — using manual DNS verification (no automatic TLS)',
      };
    }
    try {
      const teamQuery = process.env.VERCEL_TEAM_ID
        ? `?teamId=${process.env.VERCEL_TEAM_ID}`
        : '';
      const res = await withTimeout(
        fetch(
          `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}${teamQuery}`,
          { headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` } },
        ),
        CHECK_TIMEOUT_MS,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { status: 'ok', detail: 'Authenticated' };
    } catch (err) {
      return {
        status: 'error',
        detail: `Configured but failing — ${errorMessage(err)}`,
      };
    }
  }

  private checkSentry(): CheckOutcome {
    return process.env.SENTRY_DSN
      ? { status: 'ok', detail: 'Configured' }
      : { status: 'warn', detail: 'Not configured (optional)' };
  }
}

export function overallStatus(results: HealthCheckResult[]): CheckStatus {
  if (results.some((r) => r.status === 'error')) return 'error';
  if (results.some((r) => r.status === 'warn')) return 'warn';
  return 'ok';
}
