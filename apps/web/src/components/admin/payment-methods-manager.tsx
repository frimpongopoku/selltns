"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { createPaymentMethod, updatePaymentMethod } from "@/lib/api";
import type { PaymentMethod } from "@/lib/types";

export function PaymentMethodsManager({ methods }: { methods: PaymentMethod[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"MOMO" | "BANK">("MOMO");
  const [label, setLabel] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function toggleEnabled(method: PaymentMethod, isEnabled: boolean) {
    await updatePaymentMethod(method.id, { isEnabled });
    router.refresh();
  }

  async function setPreferred(method: PaymentMethod) {
    await updatePaymentMethod(method.id, { isPreferred: true });
    toast.success(`${method.label} set as preferred`);
    router.refresh();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createPaymentMethod({
        type,
        label,
        details: type === "MOMO" ? { number, name } : { accountName: name, accountNumber: number },
        isEnabled: true,
      });
      toast.success("Payment method added");
      setOpen(false);
      setLabel("");
      setNumber("");
      setName("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add MOMO or Bank options. Mark one preferred to highlight it for customers.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-1.5" />}>
            <Plus className="h-4 w-4" />
            Add method
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add payment method</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
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
                <Input id="label" required value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1.5" placeholder="MTN Mobile Money" />
              </div>
              <div>
                <Label htmlFor="number">{type === "MOMO" ? "Number" : "Account number"}</Label>
                <Input id="number" required value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="name">{type === "MOMO" ? "Registered name" : "Account name"}</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding…" : "Add method"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {methods.map((method) => (
          <Card key={method.id} className="flex flex-row items-center justify-between gap-4 p-5 transition-shadow hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="flex items-center gap-1.5 font-medium">
                  {method.label}
                  {method.isPreferred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Object.values(method.details).join(" · ")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!method.isPreferred && (
                <Button variant="outline" size="sm" onClick={() => setPreferred(method)}>
                  Set preferred
                </Button>
              )}
              <Switch checked={method.isEnabled} onCheckedChange={(v) => toggleEnabled(method, v)} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
