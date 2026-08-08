"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Storefront-scoped — a crash on one store's pages shouldn't need to fall
// through to the bare root fallback; tenant context is already attached to
// this error via Sentry.setTag("tenant", ...) in [slug]/layout.tsx.
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="store-heading text-lg font-medium">Something went wrong.</p>
      <p className="store-muted max-w-sm text-sm">
        We&apos;ve been notified. Try again, or contact the store if it keeps
        happening.
      </p>
      {error.digest && (
        <p className="store-muted font-mono text-xs opacity-70">{error.digest}</p>
      )}
      <button onClick={reset} className="store-btn-primary mt-2 px-4 py-2 text-sm font-medium">
        Try again
      </button>
    </div>
  );
}
