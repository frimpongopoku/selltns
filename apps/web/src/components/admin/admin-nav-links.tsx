"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, SETTINGS_NAV_ITEMS, ADVANCED_NAV_ITEMS } from "./nav-items";
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
  const advancedItems = ADVANCED_NAV_ITEMS.filter((item) =>
    visibleTo("roles" in item ? item.roles : undefined, role),
  );

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
        <>
          <p className="mt-6 mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">
            Settings
          </p>
          {settingsItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(active)}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </>
      )}

      {advancedItems.length > 0 && (
        <>
          <p className="mt-6 mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">
            Advanced
          </p>
          {advancedItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(active)}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );
}
