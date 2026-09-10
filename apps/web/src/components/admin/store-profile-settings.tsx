"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, MessageCircle, MessageCircleHeart, Phone, Store, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LogoPicker } from "@/components/admin/logo-picker";
import {
  updateTenantProfile,
  updateTenantOwnershipInfo,
  updateTenantContactSection,
  updateBespokeRequests,
} from "@/lib/api";
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
      <NameCard tenant={tenant} />
      <LogoCard tenant={tenant} />

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
      <ContactSectionCard tenant={tenant} />
      <BespokeRequestsCard tenant={tenant} />
    </div>
  );
}

function NameCard({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [name, setName] = useState(tenant.name);
  const [saving, setSaving] = useState(false);

  const dirty = name.trim() !== tenant.name;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Store name can't be empty");
      return;
    }
    setSaving(true);
    try {
      await updateTenantProfile(tenant.id, { name: trimmed });
      toast.success("Store name updated");
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
        <Store className="h-4 w-4 text-emerald-600" />
        <p className="text-sm font-medium">Store name</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Shown across your storefront, checkout, and order emails. Your store&apos;s web address
        doesn&apos;t change when you rename it.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="store-name" className="sr-only">Store name</Label>
          <Input id="store-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  );
}

function LogoCard({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl);
  const [saving, setSaving] = useState(false);

  // Persists on every change — a logo picker that only feels "applied" on
  // upload but silently needs a separate Save click is exactly the kind of
  // two-step flow vendors miss, so there's deliberately no Save button here.
  async function handleChange(url: string | null) {
    setLogoUrl(url);
    setSaving(true);
    try {
      await updateTenantProfile(tenant.id, { logoUrl: url });
      toast.success(url ? "Logo updated" : "Logo removed");
      router.refresh();
    } catch {
      toast.error("Couldn't save your logo. Please try again.");
      setLogoUrl(tenant.logoUrl);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-emerald-600" />
        <p className="text-sm font-medium">Logo</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Shown in your storefront&apos;s header and footer, and used as the browser-tab icon —
        on {tenant.customDomain ?? "your selltns.com link"} too.
      </p>
      <div className="mt-4">
        <LogoPicker tenantId={tenant.id} logoUrl={logoUrl} saving={saving} onChange={handleChange} />
      </div>
    </Card>
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

function ContactSectionCard({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [contactEmail, setContactEmail] = useState(tenant.contactEmail ?? "");
  const [visible, setVisible] = useState(tenant.contactSectionVisible);
  const [saving, setSaving] = useState(false);

  const dirty =
    contactEmail !== (tenant.contactEmail ?? "") ||
    visible !== tenant.contactSectionVisible;

  async function handleSave() {
    setSaving(true);
    try {
      await updateTenantContactSection(tenant.id, {
        contactEmail: contactEmail.trim() || null,
        contactSectionVisible: visible,
      });
      toast.success("Contact section updated");
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
        <Phone className="h-4 w-4 text-emerald-600" />
        <p className="text-sm font-medium">Contact section</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Adds a small &quot;get in touch&quot; block to your storefront so visitors can call,
        WhatsApp, or email you directly — using the WhatsApp number above and the email
        below. Entirely optional; off by default.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <Label htmlFor="contact-email">Public contact email (optional)</Label>
          <Input
            id="contact-email"
            type="email"
            className="mt-1.5"
            placeholder="hello@yourshop.com"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Shown only if you turn this on below — kept separate from your login email.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Show on storefront</p>
            <p className="text-xs text-muted-foreground">
              When off, no contact section appears to customers.
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

function BespokeRequestsCard({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(tenant.bespokeRequestsEnabled);
  const [saving, setSaving] = useState(false);
  const hasWhatsapp = !!tenant.whatsappNumber;

  async function handleToggle(checked: boolean) {
    setEnabled(checked);
    setSaving(true);
    try {
      await updateBespokeRequests(tenant.id, checked);
      toast.success(checked ? "Custom order requests turned on" : "Custom order requests turned off");
      router.refresh();
    } catch {
      toast.error("Couldn't save changes. Please try again.");
      setEnabled(!checked);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <MessageCircleHeart className="h-4 w-4 text-emerald-600" />
        <p className="text-sm font-medium">Custom order requests</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Adds a &quot;Don&apos;t see what you&apos;re looking for?&quot; banner on your storefront
        that messages you on WhatsApp — for customers who want something bespoke you don&apos;t
        have listed.
      </p>
      {!hasWhatsapp && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Add your WhatsApp number above first — this banner needs it.
        </p>
      )}
      <div className="mt-3 flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Show on storefront</p>
          <p className="text-xs text-muted-foreground">Off by default.</p>
        </div>
        <Switch checked={enabled} disabled={!hasWhatsapp || saving} onCheckedChange={handleToggle} />
      </div>
    </Card>
  );
}
