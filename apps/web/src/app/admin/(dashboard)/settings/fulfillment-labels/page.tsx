import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { FulfillmentLabelManager } from "@/components/admin/fulfillment-label-manager";

export const metadata = { title: "Fulfillment labels" };

export default async function AdminFulfillmentLabelsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER", "MANAGER"]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Fulfillment labels</h1>
      <p className="text-sm text-muted-foreground">
        Branded, print-ready labels for {me.tenant.name} — pick a design, print it at 4×6in, and
        stick it on the package. Write the recipient&apos;s name, phone, and delivery location by
        hand before it goes out.
      </p>
      <div className="mt-7">
        <FulfillmentLabelManager tenant={me.tenant} />
      </div>
    </div>
  );
}
