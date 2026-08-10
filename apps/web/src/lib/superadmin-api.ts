import type { SuperAdminAdmin } from "./superadmin-types";

async function parseFailure(path: string, res: Response): Promise<never> {
  const body = await res.text();
  const parsedMessage = (() => {
    try {
      return (JSON.parse(body) as { message?: string }).message;
    } catch {
      return undefined;
    }
  })();
  throw new Error(parsedMessage ?? `Superadmin API ${path} failed (${res.status}): ${body}`);
}

// Client-side actions, through the same-origin /api/superadmin/* proxy
// (app/api/superadmin/[...path]/route.ts) — mirrors lib/api.ts's
// adminRequest() pattern.
async function superAdminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/superadmin${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) return parseFailure(path, res);
  return res.json() as Promise<T>;
}

export const approveVerification = (id: string) =>
  superAdminRequest<{ ok: true }>(`/verifications/${id}/approve`, { method: "POST" });
export const rejectVerification = (id: string, reason: string) =>
  superAdminRequest<{ ok: true }>(`/verifications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const suspendTenant = (id: string, reason: string) =>
  superAdminRequest(`/tenants/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const unsuspendTenant = (id: string) =>
  superAdminRequest(`/tenants/${id}/unsuspend`, { method: "POST" });
export const inviteSuperAdmin = (email: string) =>
  superAdminRequest<SuperAdminAdmin>(`/admins/invite`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
export const verifyUser = (userId: string) =>
  superAdminRequest<{ ok: true }>(`/users/${userId}/verify`, { method: "POST" });
export const unverifyUser = (userId: string) =>
  superAdminRequest<{ ok: true }>(`/users/${userId}/unverify`, { method: "POST" });
