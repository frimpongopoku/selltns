"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateTenantProfile } from "@/lib/api";
import { toWhatsAppNumber } from "@/lib/phone";
import type { Tenant } from "@/lib/types";

export function StoreProfileSettings({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [whatsappNumber, setWhatsappNumber] = useState(
    tenant.whatsappNumber ?? "",
  );
  const [saving, setSaving] = useState(false);

  const dirty = whatsappNumber !== (tenant.whatsappNumber ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      const normalized = whatsappNumber
        ? toWhatsAppNumber(whatsappNumber)
        : null;
      await updateTenantProfile(tenant.id, { whatsappNumber: normalized });
      toast.success("Store profile updated");
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
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-medium">WhatsApp number</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Customers use this to send you their completed order, and it powers
          the &quot;View storefront&quot; WhatsApp share buttons across your
          store.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="whatsapp" className="sr-only">WhatsApp number</Label>
            <Input
              id="whatsapp"
              placeholder="024 555 0134"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
