"use server";

import { clearSessionCookie } from "./session";

export async function signOut() {
  await clearSessionCookie();
}
