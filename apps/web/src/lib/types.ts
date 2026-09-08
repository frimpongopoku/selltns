export type Role = "OWNER" | "MANAGER" | "STAFF";

export interface Space {
  tenantId: string;
  name: string;
  slug: string;
  role: Role;
  pending: boolean;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "MODIFIED"
  | "CANCELLED"
  | "COMPLETED";

export type ThemeTemplate = "FASHION" | "GENERAL" | "CLEAN";

export type CollectionType = "STANDARD" | "PREORDER";
export type OrderType = "STANDARD" | "PREORDER";
export type DepositType = "FULL" | "PERCENTAGE";

export type AffiliateStatus = "PENDING" | "ACTIVE" | "DECLINED" | "TERMINATED";
export type AffiliateCapType = "FIXED" | "PERCENTAGE";
export type OrderSource = "DIRECT" | "AFFILIATE";

export interface ThemeTokens {
  template: ThemeTemplate;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  fontHeading: string;
  fontBody: string;
  radius: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  customDomain: string | null;
  domainVerified: boolean;
  whatsappNumber: string | null;
  ownerDisplayName: string;
  ownerTitle: string;
  ownerBio: string;
  ownerInfoVisible: boolean;
  contactEmail: string | null;
  contactSectionVisible: boolean;
  affiliateDisclosureVisible: boolean;
  heroTagline: string;
  footerTagline: string;
  themeTokens: ThemeTokens;
  createdAt: string;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  suspended: boolean;
  suspendedReason: string | null;
  plan: PlanTier;
  planUpdatedAt: string | null;
}

export type PlanTier = "FREE" | "GROWTH" | "PRO";

export type VerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export interface VerificationStatusResult {
  status: VerificationStatus;
  legalName?: string;
  ghanaCardNumber?: string;
  rejectionReason?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
}

export interface DnsInstruction {
  type: "A" | "CNAME";
  host: string;
  value: string;
}

export interface DomainStatus {
  domain: string | null;
  verified: boolean;
  instructions: DnsInstruction[];
}

export interface TeamMember {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface MediaAsset {
  id: string;
  tenantId: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  bytes: number;
  title: string | null;
  tags: string[];
  altText: string;
  createdAt: string;
}

export interface MediaPage {
  items: MediaAsset[];
  nextCursor: string | null;
}

export interface PreorderInfo {
  collectionId: string;
  collectionTitle: string;
  depositType: DepositType;
  depositPercentage: number | null;
  fulfillmentNote: string;
}

export interface Product {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  // The active sale price, only meaningful when set and lower than `price`.
  // `price` itself never changes when a discount is applied or removed.
  discountPrice: number | null;
  sku: string;
  stock: number;
  isActive: boolean;
  images: string[];
  videoUrls: string[];
  tags: string[];
  displayOrder: number;
  createdAt: string;
  preorder?: PreorderInfo | null;
  // Set only when this product is being shown on an affiliate's storefront
  // (it belongs to another shop) — `price` is already the affiliate's
  // effective price in that case.
  affiliateSource?: {
    listingId: string;
    relationshipId: string;
    ownerTenantId: string;
    ownerTenantName: string;
  } | null;
}

export interface ProductPage {
  items: Product[];
  nextCursor: string | null;
}

export interface Collection {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string;
  themeOverride: ThemeTokens | null;
  seoTitle: string;
  seoDescription: string;
  productIds: string[];
  tags: string[];
  coverImage: string;
  type: CollectionType;
  depositType: DepositType | null;
  depositPercentage: number | null;
  fulfillmentNote: string;
  isActive: boolean;
}

export interface CollectionWithProducts extends Collection {
  products: Product[];
}

export interface CollectionPage {
  items: CollectionWithProducts[];
  nextCursor: string | null;
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: "MOMO" | "BANK";
  label: string;
  details: Record<string, string>;
  isEnabled: boolean;
  isPreferred: boolean;
}

export interface PlatformPaymentMethod {
  id: string;
  type: "MOMO" | "BANK";
  label: string;
  details: Record<string, string>;
  isEnabled: boolean;
  isPreferred: boolean;
}

export type UpgradeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface UpgradeRequest {
  id: string;
  tenantId: string;
  requestedPlan: PlanTier;
  referenceNote: string;
  status: UpgradeRequestStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface OrderItem {
  productId: string;
  title: string;
  quantity: number;
  priceAtOrder: number;
}

export interface Order {
  id: string;
  tenantId: string;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  trackingToken: string;
  paymentReference: string;
  createdAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  seenByAdminAt: string | null;
  history: { status: OrderStatus; note: string; at: string }[];
  type: OrderType;
  depositType: DepositType | null;
  depositPercentage: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  balancePaid: boolean;
  balancePaidAt: string | null;
  balanceRequestedAt: string | null;
  whatsappNumber: string | null;
  deliveryAddress: string | null;
  preorderCollectionId: string | null;
  source: OrderSource;
  affiliateTenantId: string | null;
  originatingOrderId: string | null;
}

export interface AffiliateRelationship {
  id: string;
  ownerTenantId: string;
  affiliateTenantId: string;
  status: AffiliateStatus;
  capType: AffiliateCapType;
  capValue: number;
  invitedAt: string;
  invitedByUserId: string;
  respondedAt: string | null;
  respondedByUserId: string | null;
  terminatedAt: string | null;
  terminatedByUserId: string | null;
  history: { event: string; note: string; at: string }[];
  createdAt: string;
  updatedAt: string;
  ownerTenant: { id: string; name: string; slug: string } | null;
  affiliateTenant: { id: string; name: string; slug: string } | null;
}

export interface AffiliateListing {
  id: string;
  relationshipId: string;
  productId: string;
  priceOverride: number | null;
  isActive: boolean;
  displayOrder: number;
  product: Product | null;
  ownerPrice: number;
  effectivePrice: number;
  capCeiling: number;
}

export interface AffiliateEligibleProduct {
  product: Product;
  exempt: boolean;
}

export interface AffiliateTenantRef {
  id: string;
  name: string;
  slug: string;
}

export interface AffiliatePublicSummary {
  sellsFor: AffiliateTenantRef[];
  resoldBy: AffiliateTenantRef[];
}

export type ContentBlockType = "TEXT" | "VIDEO" | "PHOTOS";

export interface ContentBlock {
  id: string;
  tenantId: string;
  type: ContentBlockType;
  heading?: string;
  body?: string;
  videoUrl?: string;
  caption?: string;
  imageUrls?: string[];
}
