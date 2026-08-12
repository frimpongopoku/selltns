"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpgradeRequestDialog } from "@/components/admin/upgrade-request-dialog";
import { PLAN_TIERS } from "@/lib/plan-tiers";
import type { PlanTier, UpgradeRequest } from "@/lib/types";

const TIER_RANK: Record<PlanTier, number> = { FREE: 0, GROWTH: 1, PRO: 2 };

export function PlanTierCards({
  currentPlan,
  pendingRequest,
}: {
  currentPlan: PlanTier;
  pendingRequest: UpgradeRequest | null;
}) {
  const [requestingPlan, setRequestingPlan] = useState<PlanTier | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_TIERS.map((tier) => {
          const isCurrent = tier.tier === currentPlan;
          const isUpgrade = TIER_RANK[tier.tier] > TIER_RANK[currentPlan];

          return (
            <Card
              key={tier.tier}
              className={`flex flex-col gap-4 p-6 ${
                isCurrent ? "border-primary ring-1 ring-primary/30" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold">{tier.name}</p>
                  {isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Current plan
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-2xl font-bold">{tier.priceLabel}</p>
                <p className="text-xs text-muted-foreground italic">{tier.for}</p>
              </div>

              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isUpgrade && (
                <Button
                  onClick={() => setRequestingPlan(tier.tier)}
                  disabled={!!pendingRequest}
                  className="mt-auto"
                >
                  Request {tier.name}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {requestingPlan && (
        <UpgradeRequestDialog
          plan={requestingPlan}
          open={!!requestingPlan}
          onOpenChange={(open) => !open && setRequestingPlan(null)}
        />
      )}
    </>
  );
}
