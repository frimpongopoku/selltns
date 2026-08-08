"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

// Scoped to the dashboard route group so AdminShell (nav/sidebar) stays
// mounted around this fallback — user/tenant/role context is already
// attached via Sentry.setUser/setTag in (dashboard)/layout.tsx.
export default function AdminError({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-medium">Something went wrong.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        We&apos;ve been notified. If this keeps happening,{" "}
        <Link href="/help" className="underline underline-offset-2">
          let us know
        </Link>{" "}
        — mention the code below.
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
