"use client";

import { useRouter } from "next/navigation";
import { Landmark, Smartphone, Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlatformPaymentMethodDialog } from "@/components/superadmin/platform-payment-method-dialog";
import {
  deletePlatformPaymentMethod,
  updatePlatformPaymentMethod,
} from "@/lib/superadmin-api";
import type { PlatformPaymentMethod } from "@/lib/superadmin-types";

function summarize(method: PlatformPaymentMethod): string {
  const parts =
    method.type === "MOMO"
      ? [method.details.network, method.details.number, method.details.name]
      : [method.details.accountName, method.details.accountNumber, method.details.branch];
  return parts.filter(Boolean).join(" · ");
}

export function PlatformPaymentMethodsManager({ methods }: { methods: PlatformPaymentMethod[] }) {
  const router = useRouter();

  async function toggleEnabled(method: PlatformPaymentMethod, isEnabled: boolean) {
    await updatePlatformPaymentMethod(method.id, { isEnabled });
    router.refresh();
  }

  async function setPreferred(method: PlatformPaymentMethod) {
    await updatePlatformPaymentMethod(method.id, { isPreferred: true });
    toast.success(`${method.label} set as preferred`);
    router.refresh();
  }

  async function remove(method: PlatformPaymentMethod) {
    await deletePlatformPaymentMethod(method.id);
    toast.success(`${method.label} removed`);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Vendors see enabled methods on their Upgrade page. Mark one preferred to highlight it.
        </p>
        <PlatformPaymentMethodDialog />
      </div>

      {methods.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-2 py-14 text-center">
          <p className="font-medium">No payment methods yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add a Mobile Money or bank option so vendors know where to send payment for a plan.
          </p>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {methods.map((method, i) => (
            <Card
              key={method.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both flex flex-col gap-4 p-5 transition-shadow duration-400 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {method.type === "MOMO" ? (
                  <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5 font-medium">
                    {method.label}
                    {method.isPreferred && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">{summarize(method)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!method.isPreferred && (
                  <Button variant="outline" size="sm" onClick={() => setPreferred(method)}>
                    Set preferred
                  </Button>
                )}
                <PlatformPaymentMethodDialog method={method} />
                <Switch checked={method.isEnabled} onCheckedChange={(v) => toggleEnabled(method, v)} />
                <button
                  type="button"
                  onClick={() => remove(method)}
                  aria-label={`Remove ${method.label}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
