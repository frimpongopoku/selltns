"use server";

import { clearSuperAdminSessionCookie } from "./superadmin-session";

export async function superAdminSignOut() {
  await clearSuperAdminSessionCookie();
}
