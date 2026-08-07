"use client";

// Unlike lib/api.ts (which calls the Nest API directly), these go through
// this app's own /api/auth/* route handlers — switching or creating a space
// mints a new session token that has to be written into the httpOnly
// session cookie server-side, which only a Next.js route handler can do.

export async function createSpace(input: { storeName: string; storeSlug: string }) {
  const res = await fetch("/api/auth/spaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message ?? "Couldn't create the new space.");
  }
  return data as { ok: true; tenant: { slug: string } };
}

export async function switchSpace(tenantId: string) {
  const res = await fetch("/api/auth/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message ?? "Couldn't switch spaces.");
  }
  return data as { ok: true; tenant: { slug: string } };
}
