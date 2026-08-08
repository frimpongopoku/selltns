"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Attaches user/tenant context to PostHog events, mirroring the same two
// mount points used for Sentry context (see components/sentry-context.tsx,
// [slug]/layout.tsx, admin/(dashboard)/layout.tsx). Admin sessions get a
// real identify() (a known person); anonymous storefront visitors get
// grouped by tenant instead, so per-store usage can still be sliced
// without treating an anonymous shopper as an identified person.
export function PostHogIdentify({
  userId,
  email,
  tenantId,
  tenantSlug,
  role,
}: {
  userId?: string;
  email?: string;
  tenantId?: string;
  tenantSlug?: string;
  role?: string;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (userId) {
      posthog.identify(userId, { email, tenantId, tenantSlug, role });
    } else if (tenantSlug) {
      posthog.group("tenant", tenantSlug, { tenantId });
    }
  }, [userId, email, tenantId, tenantSlug, role]);

  return null;
}
