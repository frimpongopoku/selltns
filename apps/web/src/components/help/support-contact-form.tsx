"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitSupportMessage } from "@/lib/api";

export function SupportContactForm({ tenantId }: { tenantId?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const renderedAt = useRef(Date.now());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await submitSupportMessage({
        name,
        email,
        message,
        tenantId,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        formRenderedAt: renderedAt.current,
      });
      setSent(true);
    } catch {
      toast.error("Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center">
        <p className="text-sm font-medium">Thanks — we&apos;ve got it.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll get back to you at {email}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Honeypot: real users never see or fill this in. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute h-0 w-0 opacity-0"
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.value) setSending(true); // silently block obvious bots
        }}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="support-name">Your name</Label>
          <Input
            id="support-name"
            className="mt-1.5"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="support-email">Email</Label>
          <Input
            id="support-email"
            type="email"
            className="mt-1.5"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="support-message">What's going on?</Label>
        <Textarea
          id="support-message"
          className="mt-1.5"
          rows={5}
          required
          placeholder="What you were trying to do, what happened instead, and any order/tracking link if this is about an order."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div>
        <Button type="submit" disabled={sending}>
          <Send className="h-4 w-4" />
          {sending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
