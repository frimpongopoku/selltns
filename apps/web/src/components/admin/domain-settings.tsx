"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, CheckCircle2, Circle, Copy, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDomainStatus, setDomain, removeDomain } from "@/lib/api";
import type { DomainStatus, Tenant } from "@/lib/types";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "selltns.com";

export function DomainSettings({ tenant }: { tenant: Tenant }) {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainInput, setDomainInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  useEffect(() => {
    getDomainStatus(tenant.id)
      .then(setStatus)
      .catch(() => toast.error("Couldn't load your domain settings."))
      .finally(() => setLoading(false));
  }, [tenant.id]);

  const hasDomain = !!status?.domain;

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!domainInput.trim()) return;
    setConnecting(true);
    try {
      const result = await setDomain(tenant.id, domainInput.trim());
      setStatus(result);
      setDomainInput("");
      setEditing(false);
      toast.success(
        hasDomain
          ? "Domain updated — add the DNS record below to finish."
          : "Domain connected — add the DNS record below to finish.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't connect that domain.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleCheckStatus() {
    setChecking(true);
    try {
      const result = await getDomainStatus(tenant.id);
      setStatus(result);
      if (result.verified) {
        toast.success("Domain verified! Your storefront is live there now.");
      } else {
        toast.info("Not verified yet — DNS changes can take a while to spread.");
      }
    } catch {
      toast.error("Couldn't check domain status.");
    } finally {
      setChecking(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeDomain(tenant.id);
      setStatus({ domain: null, verified: false, instructions: [] });
      setConfirmRemoveOpen(false);
      toast.success("Custom domain disconnected — fully unplugged, add a new one anytime.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't disconnect that domain.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Card className="border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <p className="text-sm font-medium">Your selltns URL always works</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Whether or not you connect a custom domain, your storefront stays reachable here — a
          reliable backup you can share any time, even if your own domain&apos;s DNS or SSL ever
          has an issue.
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 font-mono text-sm">
          <span>
            {APP_DOMAIN}/{tenant.slug}
          </span>
          <a
            href={`/${tenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium">Custom domain</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Point a domain you already own (e.g. yourshop.com) at your storefront. Optional —
          skip this if {APP_DOMAIN}/{tenant.slug} works fine for you.
        </p>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !hasDomain || editing ? (
          <form onSubmit={handleConnect} className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Label htmlFor="domain" className="sr-only">
                  Custom domain
                </Label>
                <Input
                  id="domain"
                  placeholder="yourshop.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  autoFocus={editing}
                />
              </div>
              <Button type="submit" disabled={connecting || !domainInput.trim()}>
                {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
                {connecting ? "Saving…" : editing ? "Save" : "Connect"}
              </Button>
            </div>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDomainInput("");
                }}
                className="self-start text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {status.verified ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900 dark:bg-emerald-950/30">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                    Your store is live at{" "}
                    <span className="font-mono">{status.domain}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    Customers can now reach your storefront directly at this domain.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <span className="font-mono text-sm">{status.domain}</span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Circle className="h-4 w-4" /> Not verified yet
                </span>
              </div>
            )}

            {!status.verified && <DnsInstructions status={status} />}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCheckStatus} disabled={checking}>
                {checking && <Loader2 className="h-4 w-4 animate-spin" />}
                {checking ? "Checking…" : "Check status"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Use a different domain
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRemoveOpen(true)}
                className="gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {status?.domain}?</DialogTitle>
            <DialogDescription>
              This unplugs everything — visitors to {status?.domain} will stop reaching your
              store right away. {APP_DOMAIN}/{tenant.slug} keeps working as always, and you can
              connect a new domain (or reconnect this one) anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing && <Loader2 className="h-4 w-4 animate-spin" />}
              {removing ? "Disconnecting…" : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DnsInstructions({ status }: { status: DomainStatus }) {
  const instructions = status.instructions.filter((i) => i.value);
  if (instructions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        We&apos;re finishing setup on our end for custom domains — check back shortly, or contact
        support if this doesn&apos;t clear up.
      </p>
    );
  }

  const hasApex = instructions.some((i) => i.type === "A");

  return (
    <div className="rounded-lg border p-3.5">
      <p className="text-xs font-medium">Add these DNS records</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasApex
          ? "The A record points your bare domain straight at an IP address; the CNAME does the same for the www version, so both work."
          : "A domain like www.yourshop.com needs a CNAME record — it points your domain at another hostname instead of an IP."}
      </p>

      <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-4 text-xs text-muted-foreground">
        <li>Log into wherever you bought the domain (GoDaddy, Namecheap, etc.).</li>
        <li>Find its DNS settings and add each record below:</li>
      </ol>

      <div className="mt-2 flex flex-col gap-2">
        {instructions.map((instruction) => (
          <div
            key={`${instruction.type}-${instruction.host}`}
            className="rounded-md bg-muted/40 p-2.5 font-mono text-xs"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p>{instruction.type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Name/Host</p>
                <p>{instruction.host}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-muted-foreground">Value</p>
              <div className="mt-0.5 flex items-start justify-between gap-2">
                <p className="min-w-0 break-all">{instruction.value}</p>
                <CopyValueButton value={instruction.value} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Then come back and click &quot;Check status&quot; — DNS changes can take anywhere from a few
        minutes to 48 hours to take effect.
      </p>
    </div>
  );
}

function CopyValueButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Try selecting the text manually.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-background px-1.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
