"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Root-level fallback — catches anything not already caught by a more
// specific error.tsx (see app/[slug]/error.tsx, app/admin/error.tsx).
export default function RootError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-medium">Something went wrong.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        We&apos;ve been notified. Try again, or mention the code below if you
        reach out to us.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground/70">{error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Try again
      </button>
    </div>
  );
}
