"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateTenantStorefrontCopy } from "@/lib/api";
import type { Tenant } from "@/lib/types";

export function StorefrontCopyEditor({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [heroTagline, setHeroTagline] = useState(tenant.heroTagline);
  const [footerTagline, setFooterTagline] = useState(tenant.footerTagline);
  const [saving, setSaving] = useState(false);

  const dirty = heroTagline !== tenant.heroTagline || footerTagline !== tenant.footerTagline;

  async function handleSave() {
    setSaving(true);
    try {
      await updateTenantStorefrontCopy(tenant.id, { heroTagline, footerTagline });
      toast.success("Storefront copy updated");
      router.refresh();
    } catch {
      toast.error("Couldn't save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Card className="p-5">
        <p className="text-sm font-medium">Homepage tagline</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Shown under your store name at the top of your homepage.
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          value={heroTagline}
          onChange={(e) => setHeroTagline(e.target.value)}
        />
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium">Footer tagline</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Shown in the footer on every page of your storefront.
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          value={footerTagline}
          onChange={(e) => setFooterTagline(e.target.value)}
        />
      </Card>

      <div>
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
