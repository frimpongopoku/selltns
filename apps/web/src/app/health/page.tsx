import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { getApiHealth } from "@/lib/health";
import { BUILD_LABEL } from "@/lib/build-info";
import type { CheckStatus } from "@/lib/health";

export const metadata: Metadata = {
  title: "System status — Selltns",
  description: "Live status of the Selltns platform.",
};

const STATUS_COPY: Record<CheckStatus, string> = {
  ok: "All systems operational",
  warn: "Operational, with dev fallbacks active",
  error: "Something needs attention",
};

const STATUS_CLASS: Record<CheckStatus, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  error: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const DOT_CLASS: Record<CheckStatus, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  error: "bg-red-500",
};

export default async function StatusPage() {
  const apiHealth = await getApiHealth();
  const overall: CheckStatus = !apiHealth ? "error" : apiHealth.status;

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-medium text-muted-foreground">Status</p>
        <h1 className="mt-1 text-3xl font-semibold">System status</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Live checks across the web app and API.
        </p>

        <div
          className={`mt-8 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${STATUS_CLASS[overall]}`}
        >
          <span className={`h-2 w-2 rounded-full ${DOT_CLASS[overall]}`} />
          {!apiHealth ? "Can't reach the API" : STATUS_COPY[overall]}
        </div>

        <section className="mt-10">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Web app
          </h2>
          <div className="mt-3 divide-y rounded-xl border">
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">Frontend (Next.js)</span>
              </div>
              <span className="text-xs text-muted-foreground">{BUILD_LABEL}</span>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            API
          </h2>
          {!apiHealth ? (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
              Couldn&apos;t reach the API — it may be down or unreachable from
              this deployment.
            </div>
          ) : (
            <>
              <div className="mt-3 divide-y rounded-xl border">
                {apiHealth.checks.map((check) => (
                  <div
                    key={check.name}
                    className="flex items-center justify-between gap-4 px-4 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[check.status]}`}
                      />
                      <span className="truncate text-sm font-medium">{check.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span className="hidden sm:inline">{check.detail}</span>
                      <span className="tabular-nums">{check.ms}ms</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Checked in {apiHealth.totalMs}ms ·{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "medium",
                }).format(new Date(apiHealth.checkedAt))}
              </p>
            </>
          )}
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          <a href="/health" className="underline underline-offset-2">
            Refresh
          </a>
        </p>
      </div>
    </div>
  );
}
