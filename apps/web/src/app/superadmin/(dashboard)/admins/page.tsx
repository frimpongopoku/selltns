import { listAdmins } from "@/lib/superadmin-api-server";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { InviteAdminDialog } from "@/components/superadmin/invite-admin-dialog";

export const metadata = { title: "Admins — Superadmin" };

export default async function SuperAdminAdminsPage() {
  const admins = await listAdmins();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admins</h1>
          <p className="text-sm text-muted-foreground">
            Who can sign in to the superadmin dashboard.
          </p>
        </div>
        <InviteAdminDialog />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {admins.map((admin) => (
          <Card key={admin.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">{admin.name ?? admin.email}</p>
              <p className="font-mono text-xs text-muted-foreground">{admin.email}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {admin.acceptedAt ? `Joined ${formatDate(admin.acceptedAt)}` : "Invite pending"}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
