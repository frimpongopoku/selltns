import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { ThemePicker } from "@/components/admin/theme-picker";

export const metadata = { title: "Storefront theme" };

export default async function AdminThemeSettingsPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Storefront theme</h1>
      <p className="text-sm text-muted-foreground">
        Pick a starter template and a palette — every theme reads from the same design tokens, so switching never breaks your branding.
      </p>
      <div className="mt-7">
        <ThemePicker
          tenantId={me.tenant.id}
          tenantName={me.tenant.name}
          current={me.tenant.themeTokens}
        />
      </div>
    </div>
  );
}
