import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { StoreProfileSettings } from "@/components/admin/store-profile-settings";

export const metadata = { title: "Store profile" };

export default async function AdminStoreSettingsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Store profile</h1>
      <p className="text-sm text-muted-foreground">
        Contact details customers see across checkout, order tracking, and your payment page.
      </p>
      <div className="mt-7">
        <StoreProfileSettings tenant={me.tenant} />
      </div>
    </div>
  );
}
