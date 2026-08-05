import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { AdminShell } from "@/components/admin/admin-shell";
import type { TeamMember } from "@/lib/types";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getMe();
  if (!me) {
    redirect("/admin/login");
  }

  // NOTE: tenant/user identity here is real (Postgres-backed, via /auth/me).
  // Product/order/collection data elsewhere in the admin still reads the
  // shared in-memory demo catalog (apps/api/src/common/seed-data.ts) — a
  // freshly registered vendor will see their own store name here, but the
  // same demo products/orders as everyone else, until that data layer is
  // migrated too.
  const currentUser: TeamMember = {
    id: me.user.id,
    tenantId: me.tenant.id,
    name: me.user.name,
    email: me.user.email,
    role: me.role,
    invitedAt: me.tenant.createdAt,
    acceptedAt: me.tenant.createdAt,
  };

  return (
    <AdminShell tenant={me.tenant} user={currentUser}>
      {children}
    </AdminShell>
  );
}
