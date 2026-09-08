"use client";

import Image from "next/image";
import Link from "next/link";
import type { AffiliatePublicSummary, Tenant } from "@/lib/types";
import { useStoreHref, useStoreSlug } from "./store-context";
import { OwnershipCredit } from "./ownership-credit";
import { VerifiedBadge } from "./verified-badge";
import { BUILD_LABEL } from "@/lib/build-info";
import { ContactBiibisoftDialog, BIIBISOFT_CONTACT_EMAIL } from "./contact-biibisoft-dialog";
import { ContactSection } from "./contact-section";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "selltns.com";

function AffiliateShopList({ label, shops }: { label: string; shops: { id: string; name: string; slug: string }[] }) {
  if (shops.length === 0) return null;
  return (
    <p className="store-muted text-xs leading-relaxed">
      {label}{" "}
      {shops.map((shop, i) => (
        <span key={shop.id}>
          <a
            href={`https://${APP_DOMAIN}/${shop.slug}`}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--store-primary)]"
          >
            {shop.name}
          </a>
          {i < shops.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}

export function SiteFooter({
  tenant,
  hasStory,
  hasCollections,
  affiliateSummary,
  contactSectionVisible,
  whatsappNumberEncoded,
  contactEmailEncoded,
}: {
  tenant: Tenant;
  hasStory: boolean;
  hasCollections: boolean;
  affiliateSummary?: AffiliatePublicSummary;
  contactSectionVisible?: boolean;
  whatsappNumberEncoded?: string | null;
  contactEmailEncoded?: string | null;
}) {
  const slug = useStoreSlug();
  const homeHref = useStoreHref();
  const collectionsHref = useStoreHref("/collections");
  const storyHref = useStoreHref("/story");
  const helpHref = useStoreHref("/help");

  return (
    <footer className="mt-auto border-t border-[var(--store-border)] bg-[var(--store-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div>
            <p className="store-heading flex items-center gap-2 text-lg font-semibold">
              {tenant.logoUrl && (
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
                  <Image src={tenant.logoUrl} alt="" fill sizes="28px" className="object-cover" />
                </span>
              )}
              {tenant.name}
              {tenant.verificationStatus === "VERIFIED" && <VerifiedBadge />}
            </p>
            <p className="store-muted mt-3 max-w-xs text-sm leading-relaxed">
              {tenant.footerTagline}
            </p>
          </div>
          <div className="flex gap-12 text-sm sm:gap-16">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wide uppercase store-muted">Shop</span>
              <Link href={homeHref} className="transition-colors hover:text-[var(--store-primary)]">
                All products
              </Link>
              {hasCollections && (
                <Link href={collectionsHref} className="transition-colors hover:text-[var(--store-primary)]">
                  Collections
                </Link>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wide uppercase store-muted">Store</span>
              {hasStory && (
                <Link href={storyHref} className="transition-colors hover:text-[var(--store-primary)]">
                  Our Story
                </Link>
              )}
              <Link href={helpHref} className="transition-colors hover:text-[var(--store-primary)]">
                Help
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-[var(--store-primary)]">
                Privacy
              </Link>
              <span className="store-muted">
                {tenant.customDomain && tenant.domainVerified
                  ? tenant.customDomain
                  : `${APP_DOMAIN}/${slug}`}
              </span>
            </div>
          </div>
        </div>
        <ContactSection
          visible={!!contactSectionVisible}
          whatsappNumberEncoded={whatsappNumberEncoded ?? null}
          contactEmailEncoded={contactEmailEncoded ?? null}
        />
        {affiliateSummary && (affiliateSummary.sellsFor.length > 0 || affiliateSummary.resoldBy.length > 0) && (
          <div className="mt-8 flex flex-col gap-1 border-t border-[var(--store-border)] pt-6">
            <AffiliateShopList label="Also carries products from:" shops={affiliateSummary.sellsFor} />
            <AffiliateShopList label="Also available via:" shops={affiliateSummary.resoldBy} />
          </div>
        )}
        <div className="mt-10">
          <OwnershipCredit tenant={tenant} />
        </div>
        <p className="store-muted mt-3 text-xs">
          © {new Date().getFullYear()} {tenant.name}. Built on{" "}
          <a
            href={`https://${APP_DOMAIN}`}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--store-primary)]"
          >
            Selltns
          </a>
          , by the{" "}
          <ContactBiibisoftDialog className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--store-primary)]" />{" "}
          (or{" "}
          <a
            href={`mailto:${BIIBISOFT_CONTACT_EMAIL}`}
            className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--store-primary)]"
          >
            email them directly
          </a>
          ). <span className="opacity-60">{BUILD_LABEL}</span>
        </p>
      </div>
    </footer>
  );
}
