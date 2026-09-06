import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { QrCodeManager } from "@/components/admin/qr-code-manager";

export const metadata = { title: "QR code" };

export default async function AdminQrCodePage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER", "MANAGER"]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">QR code</h1>
      <p className="text-sm text-muted-foreground">
        A QR code for {me.tenant.name}, branded with your logo — share it on social media,
        download it, or print it to add to your packaging.
      </p>
      <div className="mt-7">
        <QrCodeManager tenant={me.tenant} />
      </div>
    </div>
  );
}
