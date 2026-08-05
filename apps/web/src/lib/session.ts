import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "./auth-constants";

export async function getSessionToken() {
  const store = await cookies();
  return store.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}
