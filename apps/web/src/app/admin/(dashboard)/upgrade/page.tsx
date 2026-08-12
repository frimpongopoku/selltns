import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { getBillingMessage, getPlatformPaymentMethods, getUpgradeRequests } from "@/lib/api-server";
import { PlanTierCards } from "@/components/admin/plan-tier-cards";
import { PlatformPaymentMethodCard } from "@/components/admin/platform-payment-method-card";
import { UpgradeRequestHistory } from "@/components/admin/upgrade-request-history";
import { Card } from "@/components/ui/card";
import { PLAN_LABEL } from "@/lib/plan-tiers";
import { BILLING_ENABLED } from "@/lib/feature-flags";

export const metadata = { title: "Upgrade plan" };

export default async function AdminUpgradePage() {
  // Not linked anywhere while this is off, but redirect a direct hit too —
  // see lib/feature-flags.ts for why.
  if (!BILLING_ENABLED) redirect("/admin");

  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER"]);

  const [methods, { message }, requests] = await Promise.all([
    getPlatformPaymentMethods(),
    getBillingMessage(),
    getUpgradeRequests(),
  ]);

  const pendingRequest = requests.find((r) => r.status === "PENDING") ?? null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Upgrade plan</h1>
      <p className="text-sm text-muted-foreground">
        You&apos;re currently on the <strong>{PLAN_LABEL[me.tenant.plan]}</strong> plan.
      </p>

      {pendingRequest && (
        <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Your request for the {PLAN_LABEL[pendingRequest.requestedPlan]} plan is being reviewed
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            We usually confirm within a day — you&apos;ll get an email either way.
          </p>
        </div>
      )}

      <div className="mt-7">
        <PlanTierCards currentPlan={me.tenant.plan} pendingRequest={pendingRequest} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-medium">How to pay</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send payment to one of these, then submit a request above with your reference.
        </p>

        {methods.length === 0 ? (
          <Card className="mt-4 p-6 text-sm text-muted-foreground">
            Payment details haven&apos;t been set up yet — contact Selltns support to upgrade for now.
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {methods.map((method) => (
              <PlatformPaymentMethodCard key={method.id} method={method} />
            ))}
          </div>
        )}

        {message.trim() && (
          <Card className="mt-4 p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
          </Card>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Your requests</h2>
        <div className="mt-4">
          <UpgradeRequestHistory requests={requests} />
        </div>
      </section>
    </div>
  );
}
