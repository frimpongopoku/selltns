import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageService } from './storage.service';

// Cloudflare R2 is S3-compatible, so the standard AWS SDK v3 S3 client talks
// to it directly — just point `endpoint` at the account's R2 gateway and use
// `region: 'auto'` per Cloudflare's docs.
@Injectable()
export class R2StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET_NAME as string;
    this.publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL as string).replace(
      /\/+$/,
      '',
    );
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
    });
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Processed assets are immutable — each upload gets a fresh key —
        // so they can be cached at the edge indefinitely.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}
