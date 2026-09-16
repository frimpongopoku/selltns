import Link from "next/link";
import { redirect } from "next/navigation";
import { getIncomingAffiliates } from "@/lib/api-server";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { MyAffiliateListingsManager } from "@/components/admin/my-affiliate-listings-manager";

export const metadata = { title: "Products I resell" };

export default async function ResellPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER", "MANAGER"]);

  const incoming = await getIncomingAffiliates();
  const active = incoming.filter((r) => r.status === "ACTIVE");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Products I resell</h1>
      <p className="text-sm text-muted-foreground">
        Everything you resell across every shop you&apos;re an affiliate for, in one place —
        set your own price (within the agreed cap) and choose what shows on your storefront.
      </p>
      <div className="mt-7">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You&apos;re not an active affiliate for any shop yet — accept an invite from{" "}
            <Link href="/admin/affiliates" className="underline">
              Affiliates
            </Link>{" "}
            first.
          </p>
        ) : (
          <MyAffiliateListingsManager tenantId={me.tenant.id} relationships={active} />
        )}
      </div>
    </div>
  );
}
