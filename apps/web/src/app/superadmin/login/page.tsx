"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { ShieldCheck } from "lucide-react";
import { BUILD_LABEL } from "@/lib/build-info";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HudMark } from "@/components/superadmin/hud-mark";
import { signInWithGooglePopup } from "@/lib/firebase-client";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const idToken = await signInWithGooglePopup();
      const res = await fetch("/api/superadmin-auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (res.ok) {
        router.push("/superadmin");
        return;
      }
      const body = await res.json().catch(() => ({}) as { message?: string });
      toast.error(body.message ?? "Not authorized for the superadmin dashboard.");
    } catch (err) {
      // The generic toast below tells the user nothing — this is the only
      // place the actual Firebase error code (e.g. auth/unauthorized-domain,
      // auth/popup-closed-by-user) is ever surfaced, so log it loudly.
      console.error("Google sign-in failed", err);
      Sentry.captureException(err);
      toast.error("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark superadmin-scope flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent" />
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="flex justify-center">
          <HudMark>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </HudMark>
        </div>
        <p className="mt-4 font-mono text-xs font-semibold tracking-[0.15em] text-primary uppercase">
          Superadmin
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          <Link href="/" className="transition-colors hover:text-primary">
            Selltns
          </Link>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Restricted to authorized platform administrators.
        </p>
        <Button
          onClick={handleLogin}
          disabled={loading}
          className="mt-8 w-full gap-2"
          size="lg"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.96 11.96 0 000 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
            />
          </svg>
          {loading ? "Signing in…" : "Continue with Google"}
        </Button>
      </Card>
      <p className="fixed inset-x-0 bottom-6 text-center text-xs text-muted-foreground">
        Built by the{" "}
        <a
          href="https://biibisoft.com"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          Biibisoft Team
        </a>{" "}
        <span className="opacity-60">{BUILD_LABEL}</span>
      </p>
    </div>
  );
}
