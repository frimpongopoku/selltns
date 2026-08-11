"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { Check, Loader2, X } from "lucide-react";
import { BUILD_LABEL } from "@/lib/build-info";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signInWithGooglePopup } from "@/lib/firebase-client";
import { checkSlugAvailability } from "@/lib/api";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "selltns.com";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type SlugStatus = "idle" | "checking" | "available" | "unavailable";

const SLUG_ERROR_MESSAGE: Record<string, string> = {
  reserved: "That URL is reserved — choose another.",
  invalid: "Use lowercase letters, numbers and hyphens only.",
  taken: "That URL is already taken.",
};

export default function RegisterPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setStoreName(value);
    if (!slugEdited) setStoreSlug(slugify(value));
  }

  // Debounced, live availability check — mirrors the pattern used by
  // GitHub/Shopify-style signup flows: check as the user pauses typing,
  // block continue until a slug is confirmed available.
  useEffect(() => {
    if (!storeSlug) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(async () => {
      try {
        const result = await checkSlugAvailability(storeSlug);
        if (result.available) {
          setSlugStatus("available");
          setSlugMessage("");
        } else {
          setSlugStatus("unavailable");
          setSlugMessage(
            SLUG_ERROR_MESSAGE[result.reason ?? "taken"] ?? SLUG_ERROR_MESSAGE.taken,
          );
        }
      } catch {
        // Network hiccup — don't block the user on a client-side check;
        // the server re-validates on submit regardless.
        setSlugStatus("idle");
        setSlugMessage("");
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [storeSlug]);

  async function handleContinue() {
    if (!storeName.trim()) {
      toast.error("Enter a store name first.");
      return;
    }
    if (slugStatus !== "available") {
      toast.error("Choose an available store URL first.");
      return;
    }
    setLoading(true);
    try {
      const idToken = await signInWithGooglePopup();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, storeName, storeSlug }),
      });
      if (res.ok) {
        router.push("/admin");
        return;
      }
      const body = await res.json().catch(() => ({}) as { message?: string });
      toast.error(body.message ?? "Couldn't create your store. Please try again.");
    } catch (err) {
      // The generic toast below tells the user nothing — this is the only
      // place the actual Firebase error code (e.g. auth/unauthorized-domain,
      // auth/popup-closed-by-user) is ever surfaced, so log it loudly.
      console.error("Google sign-in failed", err);
      Sentry.captureException(err);
      toast.error("Couldn't create your store. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = storeName.trim().length > 0 && slugStatus === "available";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-sm p-8">
        <Link
          href="/"
          className="block text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Selltns
        </Link>
        <h1 className="mt-1 text-center text-2xl font-semibold">Create your store</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Set up your shop, then sign in with Google to finish.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <Label htmlFor="storeName">Store name</Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Adjoa's Wardrobe"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="storeSlug">Store URL</Label>
            <div className="relative mt-1.5">
              <Input
                id="storeSlug"
                value={storeSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setStoreSlug(slugify(e.target.value));
                }}
                placeholder="adjoas-wardrobe"
                className="pr-9"
                aria-invalid={slugStatus === "unavailable"}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                {slugStatus === "checking" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {slugStatus === "available" && (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
                {slugStatus === "unavailable" && (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </span>
            </div>
            <p
              className={`mt-1.5 text-xs ${
                slugStatus === "unavailable" ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {slugStatus === "unavailable"
                ? slugMessage
                : storeSlug
                  ? `${APP_DOMAIN}/${storeSlug}`
                  : `${APP_DOMAIN}/your-store`}
            </p>
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={loading || !canSubmit}
          className="mt-6 w-full gap-2"
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
          {loading ? "Creating your store…" : "Continue with Google"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have a store?{" "}
          <Link href="/admin/login" className="underline underline-offset-2">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          By creating a store, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
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
