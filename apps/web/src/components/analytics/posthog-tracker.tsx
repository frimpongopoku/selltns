"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Initialized once at module load, client-side only. Unset key = no-op,
// same convention as every other optional integration in this app (Sentry,
// R2, Brevo, Vercel). capture_pageview is off in init() because the
// default only fires on the initial document load, not on Next's
// client-side route transitions — PageviewTracker below covers those.
if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
    person_profiles: "identified_only",
  });
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY || !pathname) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture("$pageview", { $current_url: url });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}

// Mounted once in the root layout — covers every route (storefront,
// admin, landing, auth) with one pageview tracker. useSearchParams()
// requires a Suspense boundary in the App Router or the whole tree
// bails out of static rendering.
export function PostHogTracker() {
  if (!POSTHOG_KEY) return null;
  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}
