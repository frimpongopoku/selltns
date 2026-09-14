"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Settings } from "lucide-react";
import { NAV_ITEMS, SETTINGS_NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

function visibleTo(roles: readonly Role[] | undefined, role: Role) {
  return !roles || roles.includes(role);
}

export function AdminNavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function linkClass(active: boolean) {
    return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`;
  }

  const navItems = NAV_ITEMS.filter((item) => visibleTo("roles" in item ? item.roles : undefined, role));
  const settingsItems = SETTINGS_NAV_ITEMS.filter((item) =>
    visibleTo("roles" in item ? item.roles : undefined, role),
  );
  const settingsActive = settingsItems.some((item) => isActive(item.href));
  // Manually-toggled state, but a settings sub-page always forces it open
  // (see `isSettingsOpen` below) regardless of what was last toggled — so
  // you're never looking at a highlighted child with its section collapsed.
  const [settingsToggledOpen, setSettingsToggledOpen] = useState(settingsActive);
  const isSettingsOpen = settingsToggledOpen || settingsActive;

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = isActive(item.href, "exact" in item && item.exact);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(active)}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}

      {settingsItems.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setSettingsToggledOpen((v) => !v)}
            aria-expanded={isSettingsOpen}
            className={cn(linkClass(settingsActive), "w-full justify-between")}
          >
            <span className="flex items-center gap-3">
              <Settings className="h-4 w-4" />
              Settings
            </span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition-transform", isSettingsOpen && "rotate-180")}
            />
          </button>
          {isSettingsOpen && (
            <div className="mt-1 ml-4 flex flex-col gap-1 border-l pl-3">
              {settingsItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(active)}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
