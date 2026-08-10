import { Store, ClipboardList, TrendingUp, ShieldCheck } from "lucide-react";
import { getOverview } from "@/lib/superadmin-api-server";
import { StatCard } from "@/components/admin/stat-card";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Overview" };

export default async function SuperAdminOverviewPage() {
  const overview = await getOverview();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="text-sm text-muted-foreground">
        Platform-wide activity across every store on Selltns.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Stores",
            value: String(overview.tenantCount),
            icon: <Store className="h-5 w-5" />,
          },
          {
            label: "Orders",
            value: String(overview.orderCount),
            icon: <ClipboardList className="h-5 w-5" />,
          },
          {
            label: "Completed GMV",
            value: formatMoney(overview.gmv),
            icon: <TrendingUp className="h-5 w-5" />,
          },
          {
            label: "Pending verifications",
            value: String(overview.pendingVerificationCount),
            icon: <ShieldCheck className="h-5 w-5" />,
            hint: overview.pendingVerificationCount > 0 ? "Needs review" : undefined,
          },
        ].map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-9 rounded-xl border p-5">
        <h2 className="font-medium">Signups, last 30 days</h2>
        {overview.signupsByDay.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No new stores in this window.</p>
        ) : (
          <div className="mt-4 flex flex-col divide-y">
            {overview.signupsByDay.map((row) => (
              <div key={row.date} className="flex items-center justify-between py-1.5 text-sm">
                <span className="font-mono text-muted-foreground">{row.date}</span>
                <span className="font-mono font-medium tabular-nums">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
