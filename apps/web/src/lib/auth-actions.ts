"use server";

import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "./auth-constants";

export async function signInMock() {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, "amara-boateng", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function signOutMock() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}
