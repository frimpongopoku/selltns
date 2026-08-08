"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { updateTenantProfile, updateTenantOwnershipInfo } from "@/lib/api";
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

      <OwnershipInfoCard tenant={tenant} />
    </div>
  );
}

function OwnershipInfoCard({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(tenant.ownerDisplayName);
  const [title, setTitle] = useState(tenant.ownerTitle);
  const [bio, setBio] = useState(tenant.ownerBio);
  const [visible, setVisible] = useState(tenant.ownerInfoVisible);
  const [saving, setSaving] = useState(false);

  const dirty =
    displayName !== tenant.ownerDisplayName ||
    title !== tenant.ownerTitle ||
    bio !== tenant.ownerBio ||
    visible !== tenant.ownerInfoVisible;

  async function handleSave() {
    setSaving(true);
    try {
      await updateTenantOwnershipInfo(tenant.id, {
        ownerDisplayName: displayName.trim(),
        ownerTitle: title.trim(),
        ownerBio: bio.trim(),
        ownerInfoVisible: visible,
      });
      toast.success("Ownership info updated");
      router.refresh();
    } catch {
      toast.error("Couldn't save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-emerald-600" />
        <p className="text-sm font-medium">Who&apos;s behind this shop</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Let customers know the real person behind the store — a small, tasteful
        credit shown across your storefront (footer, payment page, story
        page). Entirely optional; off by default.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="owner-name">Your name</Label>
            <Input
              id="owner-name"
              className="mt-1.5"
              placeholder="Elizabeth Opoku Agyemang"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="owner-title">Title (optional)</Label>
            <Input
              id="owner-title"
              className="mt-1.5"
              placeholder="Founder & Designer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="owner-bio">Short note (optional)</Label>
          <Textarea
            id="owner-bio"
            className="mt-1.5"
            placeholder="Handcrafted in Accra, one piece at a time."
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Show on storefront</p>
            <p className="text-xs text-muted-foreground">
              When off, none of this appears to customers.
            </p>
          </div>
          <Switch checked={visible} onCheckedChange={setVisible} />
        </div>
        <div>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
