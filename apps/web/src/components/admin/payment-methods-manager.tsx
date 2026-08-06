"use client";

import { useRouter } from "next/navigation";
import { Landmark, Smartphone, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PaymentMethodDialog } from "@/components/admin/payment-method-dialog";
import { updatePaymentMethod } from "@/lib/api";
import type { PaymentMethod } from "@/lib/types";

function summarize(method: PaymentMethod): string {
  const parts =
    method.type === "MOMO"
      ? [method.details.network, method.details.number, method.details.name]
      : [method.details.accountName, method.details.accountNumber, method.details.branch];
  return parts.filter(Boolean).join(" · ");
}

export function PaymentMethodsManager({
  tenantId,
  methods,
}: {
  tenantId: string;
  methods: PaymentMethod[];
}) {
  const router = useRouter();

  async function toggleEnabled(method: PaymentMethod, isEnabled: boolean) {
    await updatePaymentMethod(method.id, tenantId, { isEnabled });
    router.refresh();
  }

  async function setPreferred(method: PaymentMethod) {
    await updatePaymentMethod(method.id, tenantId, { isPreferred: true });
    toast.success(`${method.label} set as preferred`);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Add MOMO or Bank options. Mark one preferred to highlight it for customers.
        </p>
        <PaymentMethodDialog tenantId={tenantId} />
      </div>

      {methods.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-2 py-14 text-center">
          <p className="font-medium">No payment methods yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add a Mobile Money or bank option so customers know how to pay
            once you confirm their order.
          </p>
        </Card>
      ) : (
      <div className="mt-6 flex flex-col gap-3">
        {methods.map((method) => (
          <Card
            key={method.id}
            className="flex flex-col gap-4 p-5 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
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
                  {method.isPreferred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
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
              <PaymentMethodDialog tenantId={tenantId} method={method} />
              <Switch checked={method.isEnabled} onCheckedChange={(v) => toggleEnabled(method, v)} />
            </div>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
