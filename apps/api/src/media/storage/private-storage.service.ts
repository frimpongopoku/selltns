export const PRIVATE_STORAGE_SERVICE = Symbol('PRIVATE_STORAGE_SERVICE');

// Unlike StorageService, there is deliberately no `publicUrl()` here — these
// objects (Ghana Card scans, selfies) are never given a public or
// semi-public link. The only way bytes come back out is `getObject()`,
// called server-side from behind SuperAdminGuard (see
// superadmin/superadmin.controller.ts's photo-streaming route).
export interface PrivateStorageService {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  getObject(key: string): Promise<{ buffer: Buffer; contentType: string }>;
}
