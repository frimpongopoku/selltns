"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Tenant } from "@/lib/types";

export function DomainSettings({ tenant }: { tenant: Tenant }) {
  const [customDomain, setCustomDomain] = useState(tenant.customDomain ?? "");
  const [verified, setVerified] = useState(tenant.domainVerified);
  const [checking, setChecking] = useState(false);

  function handleVerify() {
    setChecking(true);
    setTimeout(() => {
      setVerified(true);
      setChecking(false);
      toast.success("Domain verified — it's now canonical. The subdomain will 301-redirect to it.");
    }, 1200);
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Card className="p-5">
        <p className="text-sm font-medium">Subdomain</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Every store gets this on creation. Canonical until a custom domain is verified.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm">
          {tenant.slug}.selltns.com
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium">Custom domain</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Once verified, this becomes canonical and the subdomain redirects here.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="domain" className="sr-only">Custom domain</Label>
            <Input
              id="domain"
              placeholder="www.amaraandco.com"
              value={customDomain}
              onChange={(e) => {
                setCustomDomain(e.target.value);
                setVerified(false);
              }}
            />
          </div>
          <Button onClick={handleVerify} disabled={!customDomain || checking || verified}>
            {checking ? "Checking…" : verified ? "Verified" : "Verify domain"}
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {verified ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Verified — canonical domain</span>
            </>
          ) : (
            <>
              <Circle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Not verified — point a CNAME to Vercel, then verify
              </span>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
