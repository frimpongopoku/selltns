import { redirect } from "next/navigation";
import { getIncomingAffiliates, getOutgoingAffiliates } from "@/lib/api-server";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { AffiliateManager } from "@/components/admin/affiliate-manager";

export const metadata = { title: "Affiliates" };

export default async function AdminAffiliatesPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER"]);

  const [outgoing, incoming] = await Promise.all([
    getOutgoingAffiliates(),
    getIncomingAffiliates(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Affiliates</h1>
      <p className="text-sm text-muted-foreground">
        Invite other shops to resell your products, or manage the shops that have made
        you their affiliate.
      </p>
      <div className="mt-7">
        <AffiliateManager tenant={me.tenant} outgoing={outgoing} incoming={incoming} />
      </div>
    </div>
  );
}
