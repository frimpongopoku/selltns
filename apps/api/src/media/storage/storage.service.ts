export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StorageService {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  publicUrl(key: string): string;
}
