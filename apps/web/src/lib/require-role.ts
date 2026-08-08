import { redirect } from "next/navigation";
import type { Role } from "./types";

// Call right after the `if (!me) redirect("/admin/login")` check on any
// admin page whose role isn't every role — mirrors the backend's
// @Roles(...) matrix (apps/api's per-controller guards) so a role that
// can't call the underlying API also can't reach the page for it.
export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    redirect("/admin/access-denied?reason=role");
  }
}
