"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ExternalLink, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AdminNavLinks } from "./admin-nav-links";
import { SpaceSwitcher } from "./space-switcher";
import { signOut } from "@/lib/auth-actions";
import type { Space, Tenant, TeamMember } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function BrandBlock({ tenant, spaces }: { tenant: Tenant; spaces: Space[] }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <SpaceSwitcher tenant={tenant} spaces={spaces} />
      <ThemeToggle className="shrink-0 hover:bg-accent" />
    </div>
  );
}

function UserBlock({ user }: { user: TeamMember }) {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/admin/login");
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3.5 transition-colors hover:bg-accent/50">
      <Avatar>
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground capitalize">
          {user.role.toLowerCase()}
        </p>
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

export function AdminShell({
  tenant,
  spaces,
  user,
  children,
}: {
  tenant: Tenant;
  spaces: Space[];
  user: TeamMember;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — flush against the viewport edge */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-background p-5 md:flex">
        <BrandBlock tenant={tenant} spaces={spaces} />
        <div className="flex-1 overflow-y-auto">
          <AdminNavLinks />
        </div>
        <a
          href={`/${tenant.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View storefront
        </a>
        <UserBlock user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col gap-6 p-5">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <BrandBlock tenant={tenant} spaces={spaces} />
              <div className="flex-1 overflow-y-auto">
                <AdminNavLinks onNavigate={() => setOpen(false)} />
              </div>
              <UserBlock user={user} />
            </SheetContent>
          </Sheet>
          <p className="text-sm font-medium">{tenant.name}</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 p-5 sm:p-7 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
