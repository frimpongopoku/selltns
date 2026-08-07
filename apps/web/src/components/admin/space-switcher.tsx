"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkSlugAvailability } from "@/lib/api";
import { createSpace, switchSpace } from "@/lib/auth-client";
import type { Space, Tenant } from "@/lib/types";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const SLUG_ERROR_MESSAGE: Record<string, string> = {
  reserved: "That URL is reserved — choose another.",
  invalid: "Use lowercase letters, numbers and hyphens only.",
  taken: "That URL is already taken.",
};

function roleLabel(role: Space["role"]) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function SpaceSwitcher({ tenant, spaces }: { tenant: Tenant; spaces: Space[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function handleSwitch(space: Space) {
    if (space.tenantId === tenant.id) {
      setOpen(false);
      return;
    }
    setSwitchingId(space.tenantId);
    try {
      await switchSpace(space.tenantId);
      setOpen(false);
      router.push("/admin");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't switch spaces.");
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-accent/60"
            />
          }
        >
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold leading-none">{tenant.name}</p>
            <p className="mt-1.5 truncate text-xs text-muted-foreground">{tenant.slug}.selltns.com</p>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Your spaces</DropdownMenuLabel>
            {spaces.map((space) => (
              <DropdownMenuItem
                key={space.tenantId}
                onClick={() => handleSwitch(space)}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {switchingId === space.tenantId ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : space.tenantId === tenant.id ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{space.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {space.pending ? "Pending" : roleLabel(space.role)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setTimeout(() => setCreateOpen(true), 0)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create a new space
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new space</DialogTitle>
            <DialogDescription>
              Spin up another store under your account. You can switch between them anytime from here.
            </DialogDescription>
          </DialogHeader>
          {createOpen && <CreateSpaceForm onDone={() => setCreateOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

type SlugStatus = "idle" | "checking" | "available" | "unavailable";

function CreateSpaceForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function handleNameChange(value: string) {
    setStoreName(value);
    if (!slugEdited) setStoreSlug(slugify(value));
  }

  useEffect(() => {
    if (!storeSlug) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(async () => {
      try {
        const result = await checkSlugAvailability(storeSlug);
        if (result.available) {
          setSlugStatus("available");
          setSlugMessage("");
        } else {
          setSlugStatus("unavailable");
          setSlugMessage(SLUG_ERROR_MESSAGE[result.reason ?? "taken"] ?? SLUG_ERROR_MESSAGE.taken);
        }
      } catch {
        setSlugStatus("idle");
        setSlugMessage("");
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [storeSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) {
      toast.error("Enter a store name first.");
      return;
    }
    if (slugStatus !== "available") {
      toast.error("Choose an available store URL first.");
      return;
    }
    setSaving(true);
    try {
      await createSpace({ storeName, storeSlug });
      onDone();
      router.push("/admin");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the new space.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = storeName.trim().length > 0 && slugStatus === "available";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="newStoreName">Store name</Label>
        <Input
          id="newStoreName"
          required
          value={storeName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Mintsui"
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="newStoreSlug">Store URL</Label>
        <div className="relative mt-1.5">
          <Input
            id="newStoreSlug"
            required
            value={storeSlug}
            onChange={(e) => {
              setSlugEdited(true);
              setStoreSlug(slugify(e.target.value));
            }}
            placeholder="mintsui"
            className="pr-9"
            aria-invalid={slugStatus === "unavailable"}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {slugStatus === "available" && <Check className="h-4 w-4 text-green-600 dark:text-green-400" />}
            {slugStatus === "unavailable" && <X className="h-4 w-4 text-destructive" />}
          </span>
        </div>
        <p
          className={`mt-1.5 text-xs ${
            slugStatus === "unavailable" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {slugStatus === "unavailable"
            ? slugMessage
            : storeSlug
              ? `${storeSlug}.selltns.com`
              : "your-space.selltns.com"}
        </p>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving || !canSubmit} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Creating…" : "Create space"}
        </Button>
      </DialogFooter>
    </form>
  );
}
