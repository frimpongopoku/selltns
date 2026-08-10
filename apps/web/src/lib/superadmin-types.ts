import type { VerificationStatus } from "./types";

export interface SuperAdminOverview {
  tenantCount: number;
  orderCount: number;
  gmv: number;
  pendingVerificationCount: number;
  signupsByDay: { date: string; count: number }[];
}

export type VerificationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface VerificationListItem {
  id: string;
  tenantId: string;
  legalName: string;
  ghanaCardNumber: string;
  status: VerificationRequestStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  tenant: { name: string; slug: string };
}

export interface VerificationDetail extends VerificationListItem {
  idPhotoKey: string;
  selfiePhotoKey: string | null;
  ownerEmail: string | null;
}

export interface SuperAdminTenant {
  id: string;
  name: string;
  slug: string;
  verificationStatus: VerificationStatus;
  suspended: boolean;
  suspendedReason: string | null;
  createdAt: string;
}

export interface SuperAdminTenantOwner {
  id: string;
  name: string;
  email: string;
  verified: boolean;
}

export interface SuperAdminTenantDetail extends SuperAdminTenant {
  owner: SuperAdminTenantOwner | null;
}

export interface SuperAdminAdmin {
  id: string;
  email: string;
  name: string | null;
  invitedAt: string;
  acceptedAt: string | null;
}
