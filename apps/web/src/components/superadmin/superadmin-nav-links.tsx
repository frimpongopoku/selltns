"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUPERADMIN_NAV_ITEMS } from "./nav-items";

export function SuperAdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  // A left-rule + tint rather than the vendor admin's filled pill — reads
  // more like a selected channel on a console than a button, part of what
  // keeps this dashboard visually distinct from /admin.
  function linkClass(active: boolean) {
    return `flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
      active
        ? "border-primary bg-primary/10 text-foreground"
        : "border-transparent text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
    }`;
  }

  return (
    <nav className="flex flex-col gap-1">
      {SUPERADMIN_NAV_ITEMS.map((item) => {
        const active = isActive(item.href, "exact" in item && item.exact);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(active)}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
