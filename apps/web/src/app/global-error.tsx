"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

// Only fires if the ROOT layout itself throws (very rare) — must render its
// own <html>/<body> since it fully replaces the root layout in that case.
export default function GlobalError({
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
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-lg font-medium">Something went wrong.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            We&apos;ve been notified. Try again, or mention the code below if
            you reach out to us.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground/70">{error.digest}</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={reset}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Back to home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
