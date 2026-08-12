import Link from "next/link";
import {
  listPlatformPaymentMethods,
  getBillingMessage,
  listUpgradeRequests,
} from "@/lib/superadmin-api-server";
import { PlatformPaymentMethodsManager } from "@/components/superadmin/platform-payment-methods-manager";
import { BillingMessageEditor } from "@/components/superadmin/billing-message-editor";
import { UpgradeRequestActions } from "@/components/superadmin/upgrade-request-actions";
import { RequestStatusBadge } from "@/components/superadmin/status-badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { UpgradeRequestStatus } from "@/lib/superadmin-types";

export const metadata = { title: "Billing" };

const TABS: { label: string; status?: UpgradeRequestStatus }[] = [
  { label: "Pending", status: "PENDING" },
  { label: "Approved", status: "APPROVED" },
  { label: "Rejected", status: "REJECTED" },
  { label: "All" },
];

const PLAN_LABEL: Record<string, string> = { FREE: "Free", GROWTH: "Growth", PRO: "Pro" };

export default async function SuperAdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status ?? "PENDING";
  const validStatuses: UpgradeRequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];
  const filterStatus = validStatuses.includes(activeStatus as UpgradeRequestStatus)
    ? (activeStatus as UpgradeRequestStatus)
    : undefined;

  const [methods, { message }, requests] = await Promise.all([
    listPlatformPaymentMethods(),
    getBillingMessage(),
    listUpgradeRequests(filterStatus),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="text-sm text-muted-foreground">
        What vendors see on their Upgrade page, and their requests to move onto a paid plan.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Payment details vendors will see</h2>
        <div className="mt-4">
          <PlatformPaymentMethodsManager methods={methods} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Instructions message</h2>
        <div className="mt-4 max-w-xl">
          <BillingMessageEditor initialMessage={message} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Upgrade requests</h2>

        <div className="mt-4 flex gap-1 border-b">
          {TABS.map((tab) => {
            const value = tab.status ?? "ALL";
            const active = (status ?? "PENDING") === value;
            return (
              <Link
                key={value}
                href={`/superadmin/billing?status=${value}`}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Current plan</TableHead>
                <TableHead>Requesting</TableHead>
                <TableHead>Reference / note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <p className="font-medium">{request.tenant.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{request.tenant.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{PLAN_LABEL[request.tenant.plan]}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {PLAN_LABEL[request.requestedPlan]}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate" title={request.referenceNote}>
                    {request.referenceNote}
                  </TableCell>
                  <TableCell>
                    <RequestStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(request.submittedAt)}
                  </TableCell>
                  <TableCell>
                    {request.status === "PENDING" && <UpgradeRequestActions id={request.id} />}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No requests here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
