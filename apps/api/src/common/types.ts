export type Role = 'OWNER' | 'MANAGER' | 'STAFF';

export type OrderStatus =
  'PENDING' | 'CONFIRMED' | 'MODIFIED' | 'CANCELLED' | 'COMPLETED';

export type CollectionType = 'STANDARD' | 'PREORDER';
export type OrderType = 'STANDARD' | 'PREORDER';
export type DepositType = 'FULL' | 'PERCENTAGE';

export type AffiliateStatus = 'PENDING' | 'ACTIVE' | 'DECLINED' | 'TERMINATED';
export type AffiliateCapType = 'FIXED' | 'PERCENTAGE';
export type OrderSource = 'DIRECT' | 'AFFILIATE';

export type ThemeTemplate = 'FASHION' | 'GENERAL' | 'CLEAN';

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
  affiliateDisclosureVisible: boolean;
  heroTagline: string;
  footerTagline: string;
  themeTokens: ThemeTokens;
  createdAt: string;
  verificationStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt: string | null;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  plan: 'FREE' | 'GROWTH' | 'PRO';
  planUpdatedAt: string | null;
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
  sku: string;
  stock: number;
  isActive: boolean;
  images: string[];
  videoUrls: string[];
  tags: string[];
  displayOrder: number;
  createdAt: string;
  preorder?: PreorderInfo | null;
  // Set only when this product is being shown on an affiliate's storefront —
  // `price` above is already the affiliate's effective (marked-up) price in
  // that case; `tenantId` stays the owner's, since that's who actually owns
  // and fulfills the product. See AffiliatesService/ProductsService merge.
  affiliateSource?: {
    listingId: string;
    relationshipId: string;
    ownerTenantId: string;
    ownerTenantName: string;
  } | null;
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

export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: 'MOMO' | 'BANK';
  label: string;
  details: Record<string, string>;
  isEnabled: boolean;
  isPreferred: boolean;
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

export type ContentBlockType = 'TEXT' | 'VIDEO' | 'PHOTOS';

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
