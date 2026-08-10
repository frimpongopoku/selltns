// Server-side only — fetches the API's own /health check straight from the
// Nest API (not through any proxy), so this page reflects reality even if
// the web app's other API calls are somehow broken. Mirrors the shape of
// apps/api/src/health/health.service.ts's HealthCheckResult by hand (no
// shared package between the two apps) — keep in sync if that shape changes.
export type CheckStatus = "ok" | "warn" | "error";

export interface HealthCheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
  ms: number;
}

export interface ApiHealth {
  status: CheckStatus;
  checkedAt: string;
  totalMs: number;
  checks: HealthCheckResult[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

// null means the API couldn't be reached at all (network failure, timeout,
// DNS) — distinct from a 503 with a valid "something's wrong" body, which
// parses fine and is shown as a normal degraded/error check list instead.
export async function getApiHealth(): Promise<ApiHealth | null> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    return (await res.json()) as ApiHealth;
  } catch {
    return null;
  }
}
