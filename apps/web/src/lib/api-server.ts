// Server Components only — never import this from a "use client" file.
//
// lib/api.ts's adminRequest() goes through the same-origin /api/admin proxy
// using a relative URL ("/api/admin/..."), which only resolves in a
// browser (Node's fetch has no "current page" to resolve a relative URL
// against, and even an absolute self-URL wouldn't carry the original
// request's cookies — a server-to-server fetch doesn't auto-forward them).
// So any Server Component that needs admin-only data on its *initial*
// render (not from a client-side button click) can't use adminRequest().
// This calls the Nest API directly instead, attaching the session token
// from the httpOnly cookie the same way lib/get-me.ts already does.
import { getSessionToken } from "./session";
import type { Order, TeamMember } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

async function serverAdminRequest<T>(path: string): Promise<T> {
  const token = await getSessionToken();
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const parsedMessage = (() => {
      try {
        return (JSON.parse(body) as { message?: string }).message;
      } catch {
        return undefined;
      }
    })();
    throw new Error(parsedMessage ?? `API ${path} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export const getOrders = (tenantId: string) =>
  serverAdminRequest<Order[]>(`/orders?tenantId=${tenantId}`);
export const getOrder = (id: string, tenantId: string) =>
  serverAdminRequest<Order>(`/orders/${id}?tenantId=${tenantId}`);
export const getTeam = (tenantId: string) =>
  serverAdminRequest<TeamMember[]>(`/team?tenantId=${tenantId}`);
