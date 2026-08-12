"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitUpgradeRequest } from "@/lib/api";
import { PLAN_LABEL } from "@/lib/plan-tiers";
import type { PlanTier } from "@/lib/types";

export function UpgradeRequestDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: PlanTier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [referenceNote, setReferenceNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await submitUpgradeRequest(plan, referenceNote.trim());
      toast.success(`Request sent — we'll review it and email you.`);
      onOpenChange(false);
      setReferenceNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit your request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request the {PLAN_LABEL[plan]} plan</DialogTitle>
            <DialogDescription>
              Send payment using the details above first, then tell us what to look for.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Label htmlFor="reference-note">Payment reference or note</Label>
            <Textarea
              id="reference-note"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="e.g. Sent GHS 70 via MTN MoMo just now, reference: your shop name"
              className="mt-1.5"
              required
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              We check payments by hand, so the more specific this is, the faster we can confirm it.
            </p>
          </div>
          <DialogFooter className="mt-5">
            <Button type="submit" disabled={saving || !referenceNote.trim()}>
              {saving ? "Sending…" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
