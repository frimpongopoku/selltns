import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Copy,
  MessageCircle,
  Layers,
  LayoutDashboard,
  Users,
  Globe,
  Palette,
  Store,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { BUILD_LABEL } from "@/lib/build-info";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { StorefrontPreview } from "@/components/marketing/storefront-preview";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4310";
const TITLE = "Selltns: Sell Online in Ghana, Get Paid Your Way";
const DESCRIPTION =
  "Set up a store, share one link, and get paid by Mobile Money or bank. Track every order from request to delivery — no card fees, no developer needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Selltns",
  url: SITE_URL,
  logo: `${SITE_URL}/icon`,
  description: DESCRIPTION,
  areaServed: "GH",
};

const VALUE_PROPS = [
  {
    label: "List in minutes",
    body: "Add products from your phone: name, price, a few photos. No developer, no waiting.",
  },
  {
    label: "Get paid your way",
    body: "MOMO or bank, whichever you already use. No card processing, no percentage cut on every sale.",
  },
  {
    label: "Every order, tracked",
    body: "Your customer gets one link. They watch it move from requested to confirmed to paid, with no back-and-forth.",
  },
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    label: "A dashboard that tells you what matters",
    body: "Pending requests, confirmed sales, and revenue at a glance — from your phone or laptop.",
  },
  {
    icon: Layers,
    label: "Collections and pre-orders",
    body: "Group pieces into collections, or open pre-orders with deposits for made-to-order work.",
  },
  {
    icon: Users,
    label: "Bring in your team",
    body: "Add staff or managers with their own logins and permissions. No shared passwords.",
  },
  {
    icon: Globe,
    label: "Your own domain, when you're ready",
    body: "Connect a domain you already own. Your selltns.com link keeps working either way, as a backup.",
  },
  {
    icon: Palette,
    label: "Make it look like your brand",
    body: "Pick a theme, set your colors and fonts, tell your story. Not a template everyone else has too.",
  },
  {
    icon: Store,
    label: "Running more than one shop?",
    body: "Switch between stores from the same account. No extra sign-ups, no separate logins.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-[#F8F8F6] text-[#141414] dark:bg-[#141414] dark:text-[#F2F1EE]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <span className="flex items-center gap-2">
          <Logo size={30} />
          <span className="font-heading text-lg font-bold tracking-tight">
            Selltns
          </span>
        </span>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/demo"
            className="hidden text-[#66605A] transition-colors hover:text-[#141414] sm:inline dark:text-[#A8A29B] dark:hover:text-[#F2F1EE]"
          >
            See a live store
          </Link>
          <Link
            href="/admin/login"
            className="text-[#66605A] transition-colors hover:text-[#141414] dark:text-[#A8A29B] dark:hover:text-[#F2F1EE]"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[#0E9F6E] px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98] dark:bg-[#34D399] dark:text-[#0B1F16]"
          >
            Start selling
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 pb-20 pt-8 sm:px-8 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-28">
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
          <p className="text-sm font-semibold tracking-wide text-[#0E9F6E] uppercase dark:text-[#34D399]">
            Built for Ghanaian sellers
          </p>
          <h1 className="font-heading mt-4 max-w-xl text-4xl leading-[1.1] font-bold sm:text-5xl sm:leading-[1.08]">
            Your shop, off WhatsApp DMs and onto its own link.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#66605A] sm:text-lg dark:text-[#A8A29B]">
            List your products, share one link, and get paid straight to
            Mobile Money or your bank, the way you already collect
            payments today.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-[#0E9F6E] px-6 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-[#34D399] dark:text-[#0B1F16]"
            >
              Start selling
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-full border border-[#141414]/15 px-6 py-3.5 text-sm font-medium transition-colors hover:bg-[#141414]/5 dark:border-[#F2F1EE]/15 dark:hover:bg-[#F2F1EE]/5"
            >
              See a live store
            </Link>
          </div>
        </div>

        {/* Signature element: a mock payment-reference card, the actual
            out-of-band-payment UX that appears on every order once
            confirmed (see /track), used here as concrete proof rather
            than illustration. */}
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 flex justify-center duration-700 [animation-delay:150ms] fill-mode-both lg:justify-end">
          <div className="w-full max-w-[320px] rotate-[-2deg] rounded-2xl border border-[#141414]/10 bg-white p-5 shadow-xl transition-transform duration-300 hover:rotate-0 dark:border-[#F2F1EE]/10 dark:bg-[#1C1C1C]">
            <div className="flex items-center justify-between border-b border-[#141414]/10 pb-4 dark:border-[#F2F1EE]/10">
              <div>
                <p className="text-[11px] tracking-wide text-[#66605A] uppercase dark:text-[#A8A29B]">
                  Payment reference
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-[#141414] dark:text-[#F2F1EE]">
                  NAA8842
                </p>
              </div>
              <Copy className="h-4 w-4 text-[#0E9F6E] dark:text-[#34D399]" />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[#F8F8F6] px-3 py-2.5 dark:bg-[#141414]">
              <div>
                <p className="text-xs font-medium text-[#141414] dark:text-[#F2F1EE]">
                  MTN Mobile Money
                </p>
                <p className="mt-0.5 font-mono text-xs text-[#66605A] dark:text-[#A8A29B]">
                  024 555 0134
                </p>
              </div>
              <Copy className="h-3.5 w-3.5 text-[#66605A] dark:text-[#A8A29B]" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-[#66605A] dark:text-[#A8A29B]">
              <MessageCircle className="h-3.5 w-3.5" />
              Shared straight to WhatsApp
            </div>
          </div>
        </div>
      </section>

      {/* See it in action: the actual storefront and admin dashboard */}
      <section className="border-t border-[#141414]/10 dark:border-[#F2F1EE]/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-semibold tracking-wide text-[#0E9F6E] uppercase dark:text-[#34D399]">
            See it in action
          </p>
          <h2 className="font-heading mt-3 max-w-lg text-3xl font-bold leading-tight sm:text-4xl">
            A storefront for your customers. A dashboard for you.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
              <StorefrontPreview />
              <p className="mt-3 text-sm text-[#66605A] dark:text-[#A8A29B]">
                Your customers browse, add to cart, and check out — no app to
                download.
              </p>
            </div>
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-700 [animation-delay:100ms] fill-mode-both">
              <DashboardPreview />
              <p className="mt-3 text-sm text-[#66605A] dark:text-[#A8A29B]">
                You see every order, product, and cedi of revenue in one
                place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value props: asymmetric 1+2 split rather than three equal cards */}
      <section className="border-t border-[#141414]/10 dark:border-[#F2F1EE]/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <h2 className="font-heading text-2xl font-bold">
                {VALUE_PROPS[0].label}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#66605A] sm:text-base dark:text-[#A8A29B]">
                {VALUE_PROPS[0].body}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:col-span-7 lg:border-l lg:border-[#141414]/10 lg:pl-8 dark:lg:border-[#F2F1EE]/10">
              {VALUE_PROPS.slice(1).map((item) => (
                <div key={item.label}>
                  <h2 className="font-heading text-xl font-bold">
                    {item.label}
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#66605A] dark:text-[#A8A29B]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid: everything else the platform does */}
      <section className="border-t border-[#141414]/10 dark:border-[#F2F1EE]/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">
            Everything you need to run the shop, not just list it.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.label}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-500"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0E9F6E]/10 text-[#0E9F6E] dark:bg-[#34D399]/10 dark:text-[#34D399]">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="font-heading mt-4 text-base font-bold">
                  {feature.label}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#66605A] dark:text-[#A8A29B]">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live example */}
      <section className="border-t border-[#141414]/10 dark:border-[#F2F1EE]/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-[#141414]/10 bg-white/60 p-8 sm:flex-row sm:items-center sm:p-10 dark:border-[#F2F1EE]/10 dark:bg-[#1C1C1C]/60">
            <div>
              <p className="font-heading text-2xl font-bold">
                Not sure what to expect?
              </p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[#66605A] dark:text-[#A8A29B]">
                Akosua & Co. is a working example store on Selltns. Browse
                it, add something to the cart, and see the order flow
                end to end.
              </p>
            </div>
            <Link
              href="/demo"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#141414]/15 px-6 py-3 text-sm font-medium transition-colors hover:bg-[#141414]/5 dark:border-[#F2F1EE]/15 dark:hover:bg-[#F2F1EE]/5"
            >
              See a live store
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[#141414]/10 dark:border-[#F2F1EE]/10">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <h2 className="font-heading mx-auto max-w-lg text-3xl font-bold leading-tight sm:text-4xl">
            Your store could be live before the day is out.
          </h2>
          <Link
            href="/register"
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#0E9F6E] px-7 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-[#34D399] dark:text-[#0B1F16]"
          >
            Start selling
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-5 text-xs text-[#66605A] dark:text-[#A8A29B]">
            No card required. Nothing to pay until you make a sale.
          </p>
        </div>
      </section>

      <footer className="border-t border-[#141414]/10 px-5 py-10 text-center text-xs text-[#66605A] sm:px-8 dark:border-[#F2F1EE]/10 dark:text-[#A8A29B]">
        © {new Date().getFullYear()} Selltns. Made for shops across Ghana. Built
        by the{" "}
        <a
          href="https://biibisoft.com"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[#141414] dark:hover:text-[#F2F1EE]"
        >
          Biibisoft Team
        </a>
        . <span className="opacity-60">{BUILD_LABEL}</span>
      </footer>
    </div>
  );
}
