import { redirect } from "next/navigation";
import { getMe } from "@/lib/get-me";
import { requireRole } from "@/lib/require-role";
import { getVerificationStatus } from "@/lib/api-server";
import { VerificationForm } from "@/components/admin/verification-form";

export const metadata = { title: "Get verified" };

export default async function AdminVerificationPage() {
  const me = await getMe();
  if (!me) redirect("/admin/login");
  requireRole(me.role, ["OWNER"]);

  const status = await getVerificationStatus();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Get verified</h1>
      <p className="text-sm text-muted-foreground">
        A Verified badge tells customers we&apos;ve checked your identity —
        it shows across your storefront and replaces the payment-page
        caution notice with a trust badge instead.
      </p>
      <div className="mt-7 max-w-xl">
        <VerificationForm initialStatus={status} />
      </div>
    </div>
  );
}
