import { getTenant, getTeam } from "@/lib/api";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tenant, team] = await Promise.all([getTenant(), getTeam()]);
  const currentUser = team[0];

  return (
    <AdminShell tenant={tenant} user={currentUser}>
      {children}
    </AdminShell>
  );
}
