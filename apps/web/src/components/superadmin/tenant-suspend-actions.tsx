"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { suspendTenant, unsuspendTenant } from "@/lib/superadmin-api";

export function TenantSuspendActions({
  tenantId,
  suspended,
}: {
  tenantId: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleUnsuspend() {
    setSaving(true);
    try {
      await unsuspendTenant(tenantId);
      toast.success("Store reinstated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reinstate this store.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await suspendTenant(tenantId, reason.trim());
      toast.success("Store suspended");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't suspend this store.");
    } finally {
      setSaving(false);
    }
  }

  if (suspended) {
    return (
      <Button size="sm" variant="outline" onClick={handleUnsuspend} disabled={saving} className="gap-1.5">
        <RotateCcw className="h-3.5 w-3.5" />
        Reinstate
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5 text-destructive" />}>
        <Ban className="h-3.5 w-3.5" />
        Suspend
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSuspend}>
          <DialogHeader>
            <DialogTitle>Suspend this store</DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-sm text-muted-foreground">
            Its storefront becomes unavailable to customers immediately. The
            vendor keeps dashboard access and sees this reason.
          </p>
          <div className="mt-4">
            <Label htmlFor="suspend-reason">Reason</Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Multiple reports of undelivered orders — under investigation."
              className="mt-1.5"
              required
            />
          </div>
          <DialogFooter className="mt-5">
            <Button type="submit" variant="destructive" disabled={saving || !reason.trim()}>
              {saving ? "Suspending…" : "Suspend store"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
