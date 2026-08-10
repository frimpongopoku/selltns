import { cache } from "react";
import { getSuperAdminSessionToken } from "./superadmin-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

export interface SuperAdminMe {
  id: string;
  email: string;
  name: string | null;
}

export const getSuperAdminMe = cache(async (): Promise<SuperAdminMe | null> => {
  const token = await getSuperAdminSessionToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/superadmin/auth/me`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<SuperAdminMe>;
});
