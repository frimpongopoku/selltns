import { cookies } from "next/headers";

// Kept distinct from ADMIN_SESSION_COOKIE (admin_session) so a vendor login
// and a superadmin login never collide or overwrite each other in the same
// browser — see auth-constants.ts.
export const SUPERADMIN_SESSION_COOKIE = "superadmin_session";

export async function getSuperAdminSessionToken() {
  const store = await cookies();
  return store.get(SUPERADMIN_SESSION_COOKIE)?.value;
}

export async function setSuperAdminSessionCookie(token: string) {
  const store = await cookies();
  store.set(SUPERADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSuperAdminSessionCookie() {
  const store = await cookies();
  store.delete(SUPERADMIN_SESSION_COOKIE);
}
