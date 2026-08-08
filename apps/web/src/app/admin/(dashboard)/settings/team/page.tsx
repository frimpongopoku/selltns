import { redirect } from "next/navigation";
import { getTeam } from "@/lib/api-server";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { TeamManager } from "@/components/admin/team-manager";

export const metadata = { title: "Team & roles" };

export default async function AdminTeamSettingsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER"]);
  const members = await getTeam(me.tenant.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Team & roles</h1>
      <p className="text-sm text-muted-foreground">
        Owners have full control including billing and domain. Managers handle products, orders, collections and payments. Staff handle orders and product edits.
      </p>
      <div className="mt-7">
        <TeamManager tenantId={me.tenant.id} members={members} />
      </div>
    </div>
  );
}
