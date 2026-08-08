"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Attaches user/tenant context to the browser's Sentry scope so an error
// report can be traced back to who hit it. Server-rendered errors get the
// same tags set directly in the layout server component (a separate SDK
// instance) — this covers client-side (browser) captured errors, which the
// server-side scope never sees.
export function SentryUserContext({
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
    if (userId || email) {
      Sentry.setUser({ id: userId, email });
    }
    if (tenantId) Sentry.setTag("tenantId", tenantId);
    if (tenantSlug) Sentry.setTag("tenant", tenantSlug);
    if (role) Sentry.setTag("role", role);
  }, [userId, email, tenantId, tenantSlug, role]);

  return null;
}
