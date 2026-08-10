"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HudMark } from "./hud-mark";
import { SuperAdminNavLinks } from "./superadmin-nav-links";
import { superAdminSignOut } from "@/lib/superadmin-auth-actions";
import { BUILD_LABEL } from "@/lib/build-info";
import type { SuperAdminMe } from "@/lib/get-superadmin-me";

function BiibisoftCredit() {
  return (
    <p className="px-1 text-center text-[11px] text-muted-foreground/70">
      Built by the{" "}
      <a
        href="https://biibisoft.com"
        target="_blank"
        rel="noreferrer"
        className="underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground"
      >
        Biibisoft Team
      </a>
      <span className="block opacity-70">{BUILD_LABEL}</span>
    </p>
  );
}

function BrandBlock() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <HudMark>
        <ShieldCheck className="h-4 w-4 text-primary" />
      </HudMark>
      <span className="flex flex-col leading-none">
        <span className="font-mono text-[11px] font-semibold tracking-[0.15em] text-primary uppercase">
          Superadmin
        </span>
        <span className="mt-1 text-sm font-medium text-foreground">Selltns</span>
      </span>
    </div>
  );
}

function UserBlock({ admin }: { admin: SuperAdminMe }) {
  const router = useRouter();

  async function handleLogout() {
    await superAdminSignOut();
    router.push("/superadmin/login");
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3.5 transition-colors hover:bg-accent/50">
      <Avatar>
        <AvatarFallback>{(admin.name ?? admin.email)[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{admin.name ?? admin.email}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{admin.email}</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        title="Log out"
        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SuperAdminShell({
  admin,
  children,
}: {
  admin: SuperAdminMe;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="dark superadmin-scope flex min-h-screen bg-background text-foreground">
      {/* A thin violet line along the very top of the viewport — the
          fastest-glance signal of all: even a peripheral look at the
          browser tells you you're in the restricted console, not /admin. */}
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent" />

      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-background p-5 md:flex">
        <BrandBlock />
        <div className="flex-1 overflow-y-auto">
          <SuperAdminNavLinks />
        </div>
        <UserBlock admin={admin} />
        <BiibisoftCredit />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col gap-6 p-5">
              <SheetTitle className="sr-only">Superadmin navigation</SheetTitle>
              <BrandBlock />
              <div className="flex-1 overflow-y-auto">
                <SuperAdminNavLinks onNavigate={() => setOpen(false)} />
              </div>
              <UserBlock admin={admin} />
              <BiibisoftCredit />
            </SheetContent>
          </Sheet>
          <span className="font-mono text-xs font-semibold tracking-[0.15em] text-primary uppercase">
            Superadmin
          </span>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {(admin.name ?? admin.email)[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 p-5 sm:p-7 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
