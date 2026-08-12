import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSuperAdminTenant } from "@/lib/superadmin-api-server";
import { Badge } from "@/components/ui/badge";
import { VerifiedPill } from "@/components/superadmin/status-badges";
import { formatDate } from "@/lib/format";
import { TenantSuspendActions } from "@/components/superadmin/tenant-suspend-actions";
import { UserVerifyActions } from "@/components/superadmin/user-verify-actions";
import { TenantPlanActions } from "@/components/superadmin/tenant-plan-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getSuperAdminTenant(id).catch(() => null);
  return { title: tenant ? tenant.name : "Store" };
}

export default async function SuperAdminStoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getSuperAdminTenant(id);

  return (
    <div className="max-w-2xl">
      <Link
        href="/superadmin/stores"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to stores
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        {tenant.verificationStatus === "VERIFIED" && <VerifiedPill />}
        {tenant.suspended && <Badge variant="destructive">Suspended</Badge>}
      </div>
      <p className="font-mono text-sm text-muted-foreground">
        {tenant.slug} · created {formatDate(tenant.createdAt)}
      </p>

      {tenant.suspended && tenant.suspendedReason && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Suspension reason</p>
          <p className="mt-1 text-muted-foreground">{tenant.suspendedReason}</p>
        </div>
      )}

      <div className="mt-6 rounded-xl border p-5">
        <p className="text-xs text-muted-foreground">Store actions</p>
        <div className="mt-2">
          <TenantSuspendActions tenantId={tenant.id} suspended={tenant.suspended} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-5">
        <p className="text-xs text-muted-foreground">Plan</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sets the plan directly — for arrangements made outside the self-serve upgrade flow.
          Check{" "}
          <Link href="/superadmin/billing" className="underline">
            Billing
          </Link>{" "}
          for requests submitted through the app.
        </p>
        <div className="mt-3">
          <TenantPlanActions tenantId={tenant.id} plan={tenant.plan} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-5">
        <p className="text-xs text-muted-foreground">Owner</p>
        {tenant.owner ? (
          <>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm font-medium">{tenant.owner.name}</p>
              {tenant.owner.verified && <VerifiedPill />}
            </div>
            <p className="font-mono text-sm text-muted-foreground">{tenant.owner.email}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Verifying this person marks every shop they own as Verified —
              not just this one.
            </p>
            <div className="mt-3">
              <UserVerifyActions userId={tenant.owner.id} verified={tenant.owner.verified} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No owner found for this store.</p>
        )}
      </div>
    </div>
  );
}
