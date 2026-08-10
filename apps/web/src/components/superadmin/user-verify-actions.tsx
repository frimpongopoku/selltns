"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyUser, unverifyUser } from "@/lib/superadmin-api";

export function UserVerifyActions({
  userId,
  verified,
}: {
  userId: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleVerify() {
    setSaving(true);
    try {
      await verifyUser(userId);
      toast.success("Verified — every shop this person owns now shows the badge.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't verify this person.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnverify() {
    setSaving(true);
    try {
      await unverifyUser(userId);
      toast.success("Verification removed from every shop they own.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this person.");
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
      Verify owner
    </Button>
  );
}
