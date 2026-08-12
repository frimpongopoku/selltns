import type { PlatformPaymentMethod, SuperAdminAdmin } from "./superadmin-types";

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

// Billing — Selltns' own payment details, the message shown alongside them,
// and reviewing vendors' upgrade requests.
export const createPlatformPaymentMethod = (input: {
  type: "MOMO" | "BANK";
  label: string;
  details: Record<string, string>;
  isEnabled?: boolean;
}) =>
  superAdminRequest<PlatformPaymentMethod>(`/billing/payment-methods`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updatePlatformPaymentMethod = (
  id: string,
  input: Partial<{
    type: "MOMO" | "BANK";
    label: string;
    details: Record<string, string>;
    isEnabled: boolean;
    isPreferred: boolean;
  }>,
) =>
  superAdminRequest<PlatformPaymentMethod>(`/billing/payment-methods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deletePlatformPaymentMethod = (id: string) =>
  superAdminRequest<{ id: string }>(`/billing/payment-methods/${id}`, { method: "DELETE" });
export const setBillingMessage = (message: string) =>
  superAdminRequest<{ message: string }>(`/billing/message`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
export const approveUpgradeRequest = (id: string) =>
  superAdminRequest<{ ok: true }>(`/billing/requests/${id}/approve`, { method: "POST" });
export const rejectUpgradeRequest = (id: string, reason: string) =>
  superAdminRequest<{ ok: true }>(`/billing/requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const setTenantPlan = (tenantId: string, plan: "FREE" | "GROWTH" | "PRO") =>
  superAdminRequest<{ ok: true }>(`/billing/tenants/${tenantId}/plan`, {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
