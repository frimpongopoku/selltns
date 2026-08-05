import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { DomainSettings } from "@/components/admin/domain-settings";

export const metadata = { title: "Domain" };

export default async function AdminDomainSettingsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Domain</h1>
      <p className="text-sm text-muted-foreground">
        Manage where your storefront lives.
      </p>
      <div className="mt-7">
        <DomainSettings tenant={me.tenant} />
      </div>
    </div>
  );
}
