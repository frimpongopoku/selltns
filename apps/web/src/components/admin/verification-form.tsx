"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { CheckCircle2, Clock, ShieldCheck, Upload, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { validateImageFile, ACCEPTED_IMAGE_INPUT_ACCEPT } from "@/lib/media-constraints";
import { submitVerification } from "@/lib/verification-upload";
import type { VerificationStatusResult } from "@/lib/types";

const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/;

function FilePicker({
  label,
  required,
  file,
  onChange,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleSelect(list: FileList | null) {
    const picked = list?.[0];
    if (!picked) return;
    const error = validateImageFile(picked);
    if (error) {
      toast.error(error);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(picked));
    onChange(picked);
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
        className="hidden"
        onChange={(e) => handleSelect(e.target.files)}
      />
      {file && previewUrl ? (
        <div className="mt-2 flex items-center gap-3 rounded-lg border p-2.5">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image src={previewUrl} alt="" fill className="object-cover" unoptimized />
          </div>
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{file.name}</p>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <Upload className="h-4 w-4" />
          Choose a photo
        </button>
      )}
    </div>
  );
}

export function VerificationForm({
  initialStatus,
}: {
  initialStatus: VerificationStatusResult;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [legalName, setLegalName] = useState(status.legalName ?? "");
  const [ghanaCardNumber, setGhanaCardNumber] = useState(status.ghanaCardNumber ?? "");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cardValid = GHANA_CARD_PATTERN.test(ghanaCardNumber.trim().toUpperCase());
  const canSubmit = legalName.trim().length > 1 && cardValid && !!idPhoto && !submitting;

  async function handleSubmit() {
    if (!idPhoto) return;
    setSubmitting(true);
    try {
      const result = await submitVerification({
        legalName: legalName.trim(),
        ghanaCardNumber: ghanaCardNumber.trim().toUpperCase(),
        idPhoto,
        selfiePhoto,
      });
      setStatus(result);
      toast.success("Application submitted — we'll review it shortly.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status.status === "VERIFIED") {
    return (
      <Card className="flex items-start gap-4 p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold">You&apos;re verified</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Verified badge is live across your storefront, and the
            payment-page caution notice has been replaced with it too.
          </p>
        </div>
      </Card>
    );
  }

  if (status.status === "PENDING") {
    return (
      <Card className="flex items-start gap-4 p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Clock className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold">Under review</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ve got your application for {status.legalName} and
            we&apos;re reviewing it. This usually doesn&apos;t take long —
            we&apos;ll email you either way.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex items-start gap-3 bg-muted/30 p-4">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-sm text-muted-foreground">
          Verified stores read as more trustworthy — customers pay with more
          confidence when they can see we&apos;ve checked who they&apos;re
          dealing with.
        </p>
      </Card>

      {status.status === "REJECTED" && status.rejectionReason && (
        <Card className="border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            Your last application wasn&apos;t approved
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{status.rejectionReason}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can fix the issue and submit again below.
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <Label htmlFor="legalName">Full legal name *</Label>
          <Input
            id="legalName"
            placeholder="As it appears on your Ghana Card"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="ghanaCard">Ghana Card number *</Label>
          <Input
            id="ghanaCard"
            placeholder="GHA-000000000-0"
            value={ghanaCardNumber}
            onChange={(e) => setGhanaCardNumber(e.target.value)}
            className="mt-1.5"
          />
          {ghanaCardNumber.length > 0 && !cardValid && (
            <p className="mt-1 text-xs text-destructive">
              Format: GHA-000000000-0
            </p>
          )}
        </div>
        <FilePicker label="Photo of your Ghana Card" required file={idPhoto} onChange={setIdPhoto} />
        <FilePicker
          label="Selfie holding your card (optional, strengthens review)"
          file={selfiePhoto}
          onChange={setSelfiePhoto}
        />
        <p className="text-xs text-muted-foreground">
          This is reviewed only by authorized Selltns staff to confirm your
          identity. See our{" "}
          <a href="/privacy" target="_blank" className="underline underline-offset-2">
            privacy policy
          </a>{" "}
          for details.
        </p>
        <Button onClick={handleSubmit} disabled={!canSubmit} className="self-start">
          {submitting ? "Submitting…" : "Submit for review"}
        </Button>
      </Card>
    </div>
  );
}
