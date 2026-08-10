// Server Components only — mirrors lib/api-server.ts's rationale exactly
// (see that file's comment): a Server Component needing superadmin-only
// data on its *initial* render can't go through the relative /api/superadmin
// proxy, so this calls the Nest API directly with the session token.
import { cache } from "react";
import { getSuperAdminSessionToken } from "./superadmin-session";
import type {
  SuperAdminOverview,
  VerificationDetail,
  VerificationListItem,
  VerificationRequestStatus,
  SuperAdminTenant,
  SuperAdminTenantDetail,
  SuperAdminAdmin,
} from "./superadmin-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

async function serverSuperAdminRequest<T>(path: string): Promise<T> {
  const token = await getSuperAdminSessionToken();
  const res = await fetch(`${API_URL}/superadmin${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Superadmin API ${path} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export const getOverview = () =>
  serverSuperAdminRequest<SuperAdminOverview>(`/overview`);
export const listVerifications = (status?: VerificationRequestStatus) =>
  serverSuperAdminRequest<VerificationListItem[]>(
    `/verifications${status ? `?status=${status}` : ""}`,
  );
// cache()'d — both the page and its generateMetadata (for a title that
// names the store being reviewed) fetch this within the same request.
export const getVerification = cache((id: string) =>
  serverSuperAdminRequest<VerificationDetail>(`/verifications/${id}`),
);
export const listSuperAdminTenants = (q?: string) =>
  serverSuperAdminRequest<SuperAdminTenant[]>(
    `/tenants${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  );
// cache()'d — see getVerification's comment above, same reason.
export const getSuperAdminTenant = cache((id: string) =>
  serverSuperAdminRequest<SuperAdminTenantDetail>(`/tenants/${id}`),
);
export const listAdmins = () =>
  serverSuperAdminRequest<SuperAdminAdmin[]>(`/admins`);
