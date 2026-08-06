export type Role = 'OWNER' | 'MANAGER' | 'STAFF';

export type OrderStatus =
  'PENDING' | 'CONFIRMED' | 'MODIFIED' | 'CANCELLED' | 'COMPLETED';

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
  customDomain: string | null;
  domainVerified: boolean;
  themeTokens: ThemeTokens;
  createdAt: string;
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
  tags: string[];
  displayOrder: number;
  createdAt: string;
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
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  trackingToken: string;
  createdAt: string;
  confirmedAt: string | null;
  seenByAdminAt: string | null;
  history: { status: OrderStatus; note: string; at: string }[];
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
