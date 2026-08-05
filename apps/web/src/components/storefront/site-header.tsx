"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { Tenant } from "@/lib/types";
import { CartIndicator } from "./cart-indicator";
import { useStoreSlug } from "./store-context";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function SiteHeader({ tenant }: { tenant: Tenant }) {
  const pathname = usePathname();
  const slug = useStoreSlug();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: `/${slug}`, label: "Shop" },
    { href: `/${slug}/collections`, label: "Collections" },
    { href: `/${slug}/story`, label: "Our Story" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--store-border)] bg-[var(--store-bg)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href={`/${slug}`} className="store-heading text-xl font-semibold tracking-tight">
          {tenant.name}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`store-nav-link relative py-1 text-sm transition-colors duration-150 ${
                  active ? "text-[var(--store-primary)]" : "hover:text-[var(--store-primary)]"
                }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-[1px] left-0 h-[1.5px] bg-[var(--store-primary)] transition-all duration-200 ${
                    active ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <CartIndicator />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--store-hover-bg)] md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 animate-in fade-in-0 duration-150"
          />
          <div className="absolute right-0 top-0 flex h-full w-4/5 max-w-xs animate-in slide-in-from-right duration-200 flex-col gap-1 bg-[var(--store-bg)] p-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`store-heading rounded-lg px-3 py-3 text-lg transition-colors ${
                  pathname === link.href
                    ? "text-[var(--store-primary)]"
                    : "hover:bg-[var(--store-hover-bg)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
