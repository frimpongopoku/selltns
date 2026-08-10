import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getVerification } from "@/lib/superadmin-api-server";
import { RequestStatusBadge } from "@/components/superadmin/status-badges";
import { formatDateTime } from "@/lib/format";
import { VerificationReviewActions } from "@/components/superadmin/verification-review-actions";

export const metadata = { title: "Verification — Superadmin" };

export default async function SuperAdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getVerification(id);

  return (
    <div className="max-w-2xl">
      <Link
        href="/superadmin/verifications"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to verifications
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{request.tenant.name}</h1>
        <RequestStatusBadge status={request.status} />
      </div>
      <p className="font-mono text-sm text-muted-foreground">
        {request.tenant.slug} · submitted {formatDateTime(request.submittedAt)}
      </p>

      <div className="mt-6 rounded-xl border p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Full legal name</dt>
            <dd className="mt-0.5 text-sm font-medium">{request.legalName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ghana Card number</dt>
            <dd className="mt-0.5 font-mono text-sm font-medium">{request.ghanaCardNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Owner email</dt>
            <dd className="mt-0.5 font-mono text-sm font-medium">{request.ownerEmail ?? "—"}</dd>
          </div>
          {request.rejectionReason && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Last rejection reason</dt>
              <dd className="mt-0.5 text-sm">{request.rejectionReason}</dd>
            </div>
          )}
        </dl>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Ghana Card photo</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/superadmin/verifications/${request.id}/photo/id`}
              alt="Submitted Ghana Card"
              className="mt-2 w-full rounded-lg border object-cover"
            />
          </div>
          {request.selfiePhotoKey && (
            <div>
              <p className="text-xs text-muted-foreground">Selfie</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/superadmin/verifications/${request.id}/photo/selfie`}
                alt="Submitted selfie"
                className="mt-2 w-full rounded-lg border object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {request.status === "PENDING" && (
        <div className="mt-6">
          <VerificationReviewActions id={request.id} />
        </div>
      )}
    </div>
  );
}
