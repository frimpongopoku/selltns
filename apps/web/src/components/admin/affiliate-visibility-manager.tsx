"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getAffiliateProductVisibility,
  getOutgoingAffiliates,
  setAffiliateProductVisibility,
} from "@/lib/api";
import type { AffiliateRelationship } from "@/lib/types";

type Mode = "all" | "none" | "select";

const MODES: { id: Mode; name: string; description: string }[] = [
  {
    id: "all",
    name: "Visible to all affiliates",
    description: "Every current and future affiliate can resell this.",
  },
  {
    id: "none",
    name: "Hidden from all affiliates",
    description: "No affiliate can resell this, including any you add later.",
  },
  {
    id: "select",
    name: "Hidden from select affiliates",
    description: "Choose which affiliates can't resell this — everyone else still can.",
  },
];

export function AffiliateVisibilityManager({
  tenantId,
  productId,
}: {
  tenantId: string;
  productId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<AffiliateRelationship[] | null>(null);
  const [mode, setMode] = useState<Mode>("all");
  const [hiddenFrom, setHiddenFrom] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getOutgoingAffiliates(tenantId),
      getAffiliateProductVisibility(productId, tenantId),
    ])
      .then(([relationships, visibility]) => {
        if (cancelled) return;
        setAffiliates(relationships.filter((r) => r.status === "ACTIVE"));
        const exempt = new Set(visibility.exemptRelationshipIds);
        setHiddenFrom(exempt);
        setMode(visibility.hiddenFromAll ? "none" : exempt.size > 0 ? "select" : "all");
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Couldn't load affiliate visibility.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, productId]);

  function selectMode(next: Mode) {
    setMode(next);
    setDirty(true);
  }

  function toggleAffiliate(relationshipId: string, visible: boolean) {
    setHiddenFrom((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(relationshipId);
      else next.add(relationshipId);
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await setAffiliateProductVisibility(productId, tenantId, {
        hiddenFromAll: mode === "none",
        exemptRelationshipIds: mode === "select" ? [...hiddenFrom] : [],
      });
      setHiddenFrom(new Set(result.exemptRelationshipIds));
      setMode(
        result.hiddenFromAll ? "none" : result.exemptRelationshipIds.length > 0 ? "select" : "all",
      );
      setDirty(false);
      toast.success("Affiliate visibility updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!affiliates || affiliates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You don&apos;t have any affiliates yet — this only matters once you invite one from{" "}
        <Link href="/admin/affiliates" className="underline underline-offset-2">
          Affiliates
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {MODES.map((m) => {
          const selected = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => selectMode(m.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40",
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
              </div>
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {mode === "select" && (
        <Card className="flex flex-col divide-y p-0">
          {affiliates.map((rel) => (
            <div key={rel.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="truncate text-sm font-medium">
                {rel.affiliateTenant?.name ?? "Unknown shop"}
              </p>
              <Switch
                checked={!hiddenFrom.has(rel.id)}
                onCheckedChange={(visible) => toggleAffiliate(rel.id, visible)}
              />
            </div>
          ))}
        </Card>
      )}

      <div>
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
