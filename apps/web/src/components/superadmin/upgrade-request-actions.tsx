"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
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
import { approveUpgradeRequest, rejectUpgradeRequest } from "@/lib/superadmin-api";

export function UpgradeRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleApprove() {
    setSaving(true);
    try {
      await approveUpgradeRequest(id);
      toast.success("Approved — the plan is live for this shop.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't approve this request.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await rejectUpgradeRequest(id, reason.trim());
      toast.success("Request rejected");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reject this request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={handleApprove} disabled={saving} className="gap-1.5">
        <Check className="h-3.5 w-3.5" />
        Approve
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<Button size="sm" variant="outline" disabled={saving} className="gap-1.5" />}
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleReject}>
            <DialogHeader>
              <DialogTitle>Reject this upgrade request</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <Label htmlFor="reason">Reason (shown to the vendor)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. We couldn't find a payment matching this reference — please double-check and resubmit."
                className="mt-1.5"
                required
              />
            </div>
            <DialogFooter className="mt-5">
              <Button type="submit" variant="destructive" disabled={saving || !reason.trim()}>
                {saving ? "Rejecting…" : "Reject request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
