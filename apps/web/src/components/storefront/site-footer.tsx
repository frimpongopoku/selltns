"use client";

import Link from "next/link";
import type { Tenant } from "@/lib/types";
import { useStoreSlug } from "./store-context";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "selltns.com";

export function SiteFooter({ tenant, hasStory }: { tenant: Tenant; hasStory: boolean }) {
  const slug = useStoreSlug();

  return (
    <footer className="mt-auto border-t border-[var(--store-border)] bg-[var(--store-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div>
            <p className="store-heading text-lg font-semibold">{tenant.name}</p>
            <p className="store-muted mt-3 max-w-xs text-sm leading-relaxed">
              Handmade, made-to-order pieces. Requested here, confirmed by us,
              paid your way.
            </p>
          </div>
          <div className="flex gap-12 text-sm sm:gap-16">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wide uppercase store-muted">Shop</span>
              <Link href={`/${slug}`} className="transition-colors hover:text-[var(--store-primary)]">
                All products
              </Link>
              <Link href={`/${slug}/collections`} className="transition-colors hover:text-[var(--store-primary)]">
                Collections
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wide uppercase store-muted">Store</span>
              {hasStory && (
                <Link href={`/${slug}/story`} className="transition-colors hover:text-[var(--store-primary)]">
                  Our Story
                </Link>
              )}
              <span className="store-muted">
                {tenant.customDomain && tenant.domainVerified
                  ? tenant.customDomain
                  : `${APP_DOMAIN}/${slug}`}
              </span>
            </div>
          </div>
        </div>
        <p className="store-muted mt-10 text-xs">
          © {new Date().getFullYear()} {tenant.name}. Built on Selltns, by the{" "}
          <a
            href="https://biibisoft.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--store-primary)]"
          >
            Biibisoft Team
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
