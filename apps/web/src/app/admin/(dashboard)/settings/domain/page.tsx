import { getTenant } from "@/lib/api";
import { DomainSettings } from "@/components/admin/domain-settings";

export const metadata = { title: "Domain" };

export default async function AdminDomainSettingsPage() {
  const tenant = await getTenant();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Domain</h1>
      <p className="text-sm text-muted-foreground">
        Manage where your storefront lives.
      </p>
      <div className="mt-7">
        <DomainSettings tenant={tenant} />
      </div>
    </div>
  );
}
