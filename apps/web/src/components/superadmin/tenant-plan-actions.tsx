"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setTenantPlan } from "@/lib/superadmin-api";
import type { PlanTier } from "@/lib/superadmin-types";

const PLAN_LABEL: Record<PlanTier, string> = { FREE: "Free", GROWTH: "Growth", PRO: "Pro" };

// The fallback for a purely WhatsApp-and-MoMo arrangement that never went
// through the self-serve Upgrade request form on /admin/upgrade.
export function TenantPlanActions({ tenantId, plan }: { tenantId: string; plan: PlanTier }) {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanTier>(plan);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await setTenantPlan(tenantId, selected);
      toast.success(`Plan set to ${PLAN_LABEL[selected]}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't change the plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={(v) => v && setSelected(v as PlanTier)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PLAN_LABEL) as PlanTier[]).map((tier) => (
            <SelectItem key={tier} value={tier}>
              {PLAN_LABEL[tier]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={handleSave} disabled={saving || selected === plan}>
        {saving ? "Saving…" : "Set plan"}
      </Button>
    </div>
  );
}
