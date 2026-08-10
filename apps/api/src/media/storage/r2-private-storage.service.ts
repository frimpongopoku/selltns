import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { PrivateStorageService } from './private-storage.service';

// Same R2 account/credentials as R2StorageService, but a *separate* bucket
// (R2_PRIVATE_BUCKET_NAME) that must never have public access or a custom
// domain attached — see apps/api/.env.example. Objects are only ever read
// back via getObject(), through the S3 API with account credentials, never
// a URL.
@Injectable()
export class R2PrivateStorageService implements PrivateStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.R2_PRIVATE_BUCKET_NAME as string;
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
        CacheControl: 'private, no-store',
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getObject(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const buffer = Buffer.from(
      await result.Body!.transformToByteArray(),
    );
    return { buffer, contentType: result.ContentType ?? 'image/webp' };
  }
}
