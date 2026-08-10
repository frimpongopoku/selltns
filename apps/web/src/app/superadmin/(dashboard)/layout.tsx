import { redirect } from "next/navigation";
import { getSuperAdminMe } from "@/lib/get-superadmin-me";
import { SuperAdminShell } from "@/components/superadmin/superadmin-shell";

export default async function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getSuperAdminMe();
  if (!me) {
    redirect("/superadmin/login");
  }

  return <SuperAdminShell admin={me}>{children}</SuperAdminShell>;
}
