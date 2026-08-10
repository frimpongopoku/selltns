import { Injectable } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PrivateStorageService } from './private-storage.service';

const PRIVATE_UPLOADS_ROOT = join(process.cwd(), 'private-uploads');

// Dev-only stand-in for a private R2 bucket. Unlike uploads/ (used by
// LocalDiskStorageService), this directory is never statically mounted in
// main.ts — the only way to read a file back out is this service's
// getObject(), called from behind SuperAdminGuard. Not suitable for
// production, same caveats as LocalDiskStorageService.
@Injectable()
export class LocalDiskPrivateStorageService implements PrivateStorageService {
  async putObject(key: string, body: Buffer): Promise<void> {
    const filePath = join(PRIVATE_UPLOADS_ROOT, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
  }

  async deleteObject(key: string): Promise<void> {
    await rm(join(PRIVATE_UPLOADS_ROOT, key), { force: true });
  }

  async getObject(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const buffer = await readFile(join(PRIVATE_UPLOADS_ROOT, key));
    return { buffer, contentType: 'image/webp' };
  }
}
