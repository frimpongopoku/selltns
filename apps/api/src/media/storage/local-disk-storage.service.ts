import { Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { StorageService } from './storage.service';

const UPLOADS_ROOT = join(process.cwd(), 'uploads');

// Dev-only stand-in for R2 so the upload → process → store → serve pipeline
// runs end to end without live cloud credentials. Never selected when
// R2_ACCOUNT_ID etc. are set — see media.module.ts. Not suitable for
// production: local disk isn't shared across instances or persisted safely.
@Injectable()
export class LocalDiskStorageService implements StorageService {
  private readonly publicBaseUrl: string;

  constructor() {
    const port = process.env.PORT ?? '4311';
    this.publicBaseUrl = (
      process.env.LOCAL_STORAGE_PUBLIC_URL ?? `http://localhost:${port}/uploads`
    ).replace(/\/+$/, '');
  }

  async putObject(key: string, body: Buffer): Promise<void> {
    const filePath = join(UPLOADS_ROOT, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
  }

  async deleteObject(key: string): Promise<void> {
    await rm(join(UPLOADS_ROOT, key), { force: true });
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}
