"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPlatformPaymentMethod, updatePlatformPaymentMethod } from "@/lib/superadmin-api";
import { MOMO_NETWORKS } from "@/lib/payment-method-constants";
import type { PlatformPaymentMethod } from "@/lib/superadmin-types";

export function PlatformPaymentMethodDialog({
  method,
}: {
  /** When provided, edits this method instead of creating a new one. */
  method?: PlatformPaymentMethod;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"MOMO" | "BANK">(method?.type ?? "MOMO");
  const [label, setLabel] = useState(method?.label ?? "");
  const [network, setNetwork] = useState(method?.details.network ?? MOMO_NETWORKS[0]);
  const [number, setNumber] = useState(method?.details.number ?? "");
  const [name, setName] = useState(method?.details.name ?? "");
  const [accountName, setAccountName] = useState(method?.details.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(method?.details.accountNumber ?? "");
  const [branch, setBranch] = useState(method?.details.branch ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const details: Record<string, string> =
      type === "MOMO" ? { network, number, name } : { accountName, accountNumber, branch };
    try {
      if (method) {
        await updatePlatformPaymentMethod(method.id, { type, label, details });
        toast.success("Payment method updated");
      } else {
        await createPlatformPaymentMethod({ type, label, details, isEnabled: true });
        toast.success("Payment method added");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          method ? (
            <Button variant="outline" size="sm" className="gap-1.5" />
          ) : (
            <Button className="gap-1.5" />
          )
        }
      >
        {method ? (
          <>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Add payment method
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{method ? "Edit payment method" : "Add payment method"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "MOMO" | "BANK")}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MOMO">Mobile Money</SelectItem>
                <SelectItem value="BANK">Bank account</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1.5"
              placeholder={type === "MOMO" ? "MTN Mobile Money" : "GCB Bank"}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              A friendly name vendors will see on the Upgrade page.
            </p>
          </div>

          {type === "MOMO" ? (
            <>
              <div>
                <Label>Network</Label>
                <Select value={network} onValueChange={(v) => v && setNetwork(v)}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOMO_NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="number">Number</Label>
                <Input
                  id="number"
                  required
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="mt-1.5"
                  placeholder="024 555 0134"
                />
              </div>
              <div>
                <Label htmlFor="name">Registered name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="accountName">Account name</Label>
                <Input
                  id="accountName"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account number</Label>
                <Input
                  id="accountNumber"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  required
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="mt-1.5"
                  placeholder="East Legon"
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : method ? "Save changes" : "Add method"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
