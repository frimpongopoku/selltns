"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { inviteTeamMember, removeTeamMember } from "@/lib/api";
import type { Role, TeamMember } from "@/lib/types";

const ROLE_STYLES: Record<Role, string> = {
  OWNER: "bg-neutral-900 text-white",
  MANAGER: "bg-blue-100 text-blue-800",
  STAFF: "bg-neutral-100 text-neutral-700",
};

export function TeamManager({
  tenantId,
  members,
}: {
  tenantId: string;
  members: TeamMember[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [saving, setSaving] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await inviteTeamMember(tenantId, { name, email, role });
      toast.success(`Invite sent to ${email}`);
      setOpen(false);
      setName("");
      setEmail("");
      setRole("STAFF");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the invite.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    await removeTeamMember(id, tenantId);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Invite by email — they accept via Google auth.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-1.5" />}>
            <Plus className="h-4 w-4" />
            Invite
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">Manager — products, orders, collections, payments</SelectItem>
                    <SelectItem value="STAFF">Staff — orders + product edits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Sending…" : "Send invite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {members.map((member) => (
          <Card key={member.id} className="flex flex-row items-center justify-between gap-4 p-5 transition-shadow hover:shadow-sm">
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-xs text-muted-foreground">{member.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={ROLE_STYLES[member.role]}>{member.role}</Badge>
              {!member.acceptedAt && (
                <span className="text-xs text-muted-foreground">Invite pending</span>
              )}
              {member.role !== "OWNER" && (
                <button onClick={() => handleRemove(member.id)} aria-label="Remove member">
                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
