import { getTeam } from "@/lib/api";
import { TeamManager } from "@/components/admin/team-manager";

export const metadata = { title: "Team & roles" };

export default async function AdminTeamSettingsPage() {
  const members = await getTeam();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Team & roles</h1>
      <p className="text-sm text-muted-foreground">
        Owners have full control including billing and domain. Managers handle products, orders, collections and payments. Staff handle orders and product edits.
      </p>
      <div className="mt-7">
        <TeamManager members={members} />
      </div>
    </div>
  );
}
