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
    <AdminShell tenant={me.tenant} spaces={me.spaces} user={currentUser}>
      {children}
    </AdminShell>
  );
}
