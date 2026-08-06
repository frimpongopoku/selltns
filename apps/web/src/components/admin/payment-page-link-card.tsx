"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PaymentPageLinkCard({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  const path = `/${slug}/pay`;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fullUrl = origin ? `${origin}${path}` : path;

  async function handleCopy() {
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied");
  }

  return (
    <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">Your payment page</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{fullUrl}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Share this with customers so they know how to pay you.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Copy link
        </Button>
        <Link href={path} target="_blank" rel="noreferrer">
          <Button size="sm" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </Button>
        </Link>
      </div>
    </Card>
  );
}
