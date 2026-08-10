"use client";

import { useState } from "react";
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
import { approveVerification, rejectVerification } from "@/lib/superadmin-api";

export function VerificationReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleApprove() {
    setSaving(true);
    try {
      await approveVerification(id);
      toast.success("Verified — the badge is now live for this vendor.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't approve this application.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await rejectVerification(id, reason.trim());
      toast.success("Application rejected");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reject this application.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-3">
      <Button onClick={handleApprove} disabled={saving} className="gap-2">
        <Check className="h-4 w-4" />
        Approve
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" disabled={saving} className="gap-2" />}>
          <X className="h-4 w-4" />
          Reject
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleReject}>
            <DialogHeader>
              <DialogTitle>Reject this application</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <Label htmlFor="reason">Reason (shown to the vendor)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. The photo of your Ghana Card is too blurry to read — please resubmit a clearer one."
                className="mt-1.5"
                required
              />
            </div>
            <DialogFooter className="mt-5">
              <Button type="submit" variant="destructive" disabled={saving || !reason.trim()}>
                {saving ? "Rejecting…" : "Reject application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
