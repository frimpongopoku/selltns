import Link from "next/link";
import { listSuperAdminTenants } from "@/lib/superadmin-api-server";
import { Badge } from "@/components/ui/badge";
import { VerifiedPill } from "@/components/superadmin/status-badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { TenantSuspendActions } from "@/components/superadmin/tenant-suspend-actions";

export const metadata = { title: "Stores" };

export default async function SuperAdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const tenants = await listSuperAdminTenants(q);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Stores</h1>
      <p className="text-sm text-muted-foreground">
        Every store on Selltns. Search by name or URL slug.
      </p>

      <form className="mt-5 max-w-sm">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search stores…"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <div className="mt-5 overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>
                  <Link href={`/superadmin/stores/${tenant.id}`} className="font-medium hover:underline">
                    {tenant.name}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">{tenant.slug}</p>
                </TableCell>
                <TableCell>
                  {tenant.verificationStatus === "VERIFIED" ? (
                    <VerifiedPill />
                  ) : tenant.verificationStatus === "PENDING" ? (
                    <Badge variant="secondary">Pending</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {tenant.suspended ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Active</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(tenant.createdAt)}</TableCell>
                <TableCell>
                  <TenantSuspendActions tenantId={tenant.id} suspended={tenant.suspended} />
                </TableCell>
              </TableRow>
            ))}
            {tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No stores found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
