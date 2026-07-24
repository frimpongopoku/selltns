import { getTenant } from "@/lib/api";
import { ThemePicker } from "@/components/admin/theme-picker";

export const metadata = { title: "Storefront theme" };

export default async function AdminThemeSettingsPage() {
  const tenant = await getTenant();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Storefront theme</h1>
      <p className="text-sm text-muted-foreground">
        Pick a starter template and a palette — every theme reads from the same design tokens, so switching never breaks your branding.
      </p>
      <div className="mt-7">
        <ThemePicker current={tenant.themeTokens} />
      </div>
    </div>
  );
}
