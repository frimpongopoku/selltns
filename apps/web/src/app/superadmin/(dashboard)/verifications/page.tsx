import Link from "next/link";
import { listVerifications } from "@/lib/superadmin-api-server";
import { RequestStatusBadge } from "@/components/superadmin/status-badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { VerificationRequestStatus } from "@/lib/superadmin-types";

export const metadata = { title: "Verifications" };

const TABS: { label: string; status?: VerificationRequestStatus }[] = [
  { label: "Pending", status: "PENDING" },
  { label: "Approved", status: "APPROVED" },
  { label: "Rejected", status: "REJECTED" },
  { label: "All" },
];

export default async function SuperAdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status ?? "PENDING";
  const validStatuses: VerificationRequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];
  const filterStatus = validStatuses.includes(activeStatus as VerificationRequestStatus)
    ? (activeStatus as VerificationRequestStatus)
    : undefined;
  const requests = await listVerifications(filterStatus);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Verifications</h1>
      <p className="text-sm text-muted-foreground">
        Review vendor applications for the Verified badge.
      </p>

      <div className="mt-5 flex gap-1 border-b">
        {TABS.map((tab) => {
          const value = tab.status ?? "ALL";
          const active = (status ?? "PENDING") === value;
          return (
            <Link
              key={value}
              href={`/superadmin/verifications?status=${value}`}
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
              <TableHead>Legal name</TableHead>
              <TableHead>Ghana Card</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/superadmin/verifications/${request.id}`} className="hover:underline">
                    {request.tenant.name}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">{request.tenant.slug}</p>
                </TableCell>
                <TableCell>{request.legalName}</TableCell>
                <TableCell className="font-mono text-xs">{request.ghanaCardNumber}</TableCell>
                <TableCell>
                  <RequestStatusBadge status={request.status} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatDate(request.submittedAt)}
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No applications here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
