"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyTenant, unverifyTenant } from "@/lib/superadmin-api";

// Verifies (or unverifies) just this one shop — independent of the
// person-level bulk action in UserVerifyActions, which affects every shop
// the owner runs. This is the normal, scoped way to correct or set a
// single shop's badge.
export function TenantVerifyActions({
  tenantId,
  verified,
}: {
  tenantId: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleVerify() {
    setSaving(true);
    try {
      await verifyTenant(tenantId);
      toast.success("This shop is now Verified.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't verify this shop.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnverify() {
    setSaving(true);
    try {
      await unverifyTenant(tenantId);
      toast.success("Verification removed from this shop.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this shop.");
    } finally {
      setSaving(false);
    }
  }

  if (verified) {
    return (
      <Button size="sm" variant="outline" onClick={handleUnverify} disabled={saving} className="gap-1.5">
        <ShieldOff className="h-3.5 w-3.5" />
        Remove verification
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={handleVerify} disabled={saving} className="gap-1.5">
      <ShieldCheck className="h-3.5 w-3.5" />
      Verify this shop
    </Button>
  );
}
