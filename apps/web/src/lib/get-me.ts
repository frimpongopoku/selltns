import { cache } from "react";
import { getSessionToken } from "./session";
import type { Role, Space, Tenant } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

export interface Me {
  user: { id: string; name: string; email: string };
  tenant: Tenant;
  role: Role;
  spaces: Space[];
}

export const getMe = cache(async (): Promise<Me | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/auth/me`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<Me>;
});
