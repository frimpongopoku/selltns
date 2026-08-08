import { cache } from "react";
import type {
  Collection,
  CollectionPage,
  CollectionWithProducts,
  ContentBlock,
  DomainStatus,
  MediaAsset,
  MediaPage,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductPage,
  Tenant,
  TeamMember,
  ThemeTokens,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4311";

async function parseFailure(path: string, res: Response): Promise<never> {
  const body = await res.text();
  const parsedMessage = (() => {
    try {
      return (JSON.parse(body) as { message?: string }).message;
    } catch {
      return undefined;
    }
  })();
  throw new Error(parsedMessage ?? `API ${path} failed (${res.status}): ${body}`);
}

// For public, unauthenticated reads/writes the storefront makes directly
// against the Nest API (product/collection listings, checkout, tracking).
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) return parseFailure(path, res);
  return res.json() as Promise<T>;
}

// For admin-only calls. Goes through the same-origin /api/admin/* proxy
// (app/api/admin/[...path]/route.ts) instead of hitting the Nest API
// directly, so the httpOnly session cookie can be attached as a Bearer
// token server-side — this function is called from both server and
// "use client" admin components, and client JS can never read that cookie
// itself. The Nest API enforces the actual role check; this is just how
// the token gets there.
async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) return parseFailure(path, res);
  return res.json() as Promise<T>;
}

// Tenant
export const getTenantBySlug = cache((slug: string) =>
  request<Tenant>(`/tenants/by-slug/${slug}`),
);
export const checkSlugAvailability = (slug: string) =>
  request<{ available: boolean; reason?: "invalid" | "reserved" | "taken" }>(
    `/tenants/check-slug/${slug}`,
  );
export const getPublicTenantDirectory = () =>
  request<Tenant[]>("/tenants/public-directory");
export const updateTenantTheme = (tenantId: string, themeTokens: ThemeTokens) =>
  adminRequest<Tenant>(`/tenants/${tenantId}/theme`, {
    method: "PATCH",
    body: JSON.stringify(themeTokens),
  });
export const updateTenantProfile = (
  tenantId: string,
  input: { whatsappNumber?: string | null },
) =>
  adminRequest<Tenant>(`/tenants/${tenantId}/profile`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const updateTenantOwnershipInfo = (
  tenantId: string,
  input: {
    ownerDisplayName?: string;
    ownerTitle?: string;
    ownerBio?: string;
    ownerInfoVisible?: boolean;
  },
) =>
  adminRequest<Tenant>(`/tenants/${tenantId}/ownership-info`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const getDomainStatus = (tenantId: string) =>
  adminRequest<DomainStatus>(`/tenants/${tenantId}/domain`);
export const setDomain = (tenantId: string, domain: string) =>
  adminRequest<DomainStatus>(`/tenants/${tenantId}/domain`, {
    method: "POST",
    body: JSON.stringify({ domain }),
  });
export const removeDomain = (tenantId: string) =>
  adminRequest<void>(`/tenants/${tenantId}/domain`, { method: "DELETE" });

// Products
export const getProducts = (tenantId: string) =>
  request<Product[]>(`/products?tenantId=${tenantId}`);
export interface GetProductsPageParams {
  cursor?: string;
  limit?: number;
  q?: string;
  status?: "active" | "inactive" | "all";
  tag?: string;
}
export const getProductsPage = (tenantId: string, params: GetProductsPageParams = {}) => {
  const search = new URLSearchParams({ tenantId, paginate: "true" });
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.tag) search.set("tag", params.tag);
  return request<ProductPage>(`/products?${search.toString()}`);
};
export const getProductTags = (tenantId: string) =>
  request<string[]>(`/products/tags?tenantId=${tenantId}`);
export const getProduct = (idOrSlug: string, tenantId: string) =>
  request<Product>(`/products/${idOrSlug}?tenantId=${tenantId}`);
export const createProduct = (tenantId: string, input: Partial<Product>) =>
  adminRequest<Product>("/products", {
    method: "POST",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const updateProduct = (
  id: string,
  tenantId: string,
  input: Partial<Product>,
) =>
  adminRequest<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const deleteProduct = (id: string, tenantId: string) =>
  adminRequest<{ id: string }>(`/products/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });

// Collections
export const getCollections = (tenantId: string) =>
  request<CollectionWithProducts[]>(`/collections?tenantId=${tenantId}`);
export interface GetCollectionsPageParams {
  cursor?: string;
  limit?: number;
  q?: string;
  tag?: string;
}
export const getCollectionsPage = (tenantId: string, params: GetCollectionsPageParams = {}) => {
  const search = new URLSearchParams({ tenantId, paginate: "true" });
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.q) search.set("q", params.q);
  if (params.tag) search.set("tag", params.tag);
  return request<CollectionPage>(`/collections?${search.toString()}`);
};
export const getCollectionTags = (tenantId: string) =>
  request<string[]>(`/collections/tags?tenantId=${tenantId}`);
export const getCollection = (idOrSlug: string, tenantId: string) =>
  request<CollectionWithProducts>(`/collections/${idOrSlug}?tenantId=${tenantId}`);
export const createCollection = (tenantId: string, input: Partial<Collection>) =>
  adminRequest<CollectionWithProducts>("/collections", {
    method: "POST",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const updateCollection = (
  id: string,
  tenantId: string,
  input: Partial<Collection>,
) =>
  adminRequest<CollectionWithProducts>(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const deleteCollection = (id: string, tenantId: string) =>
  adminRequest<{ id: string }>(`/collections/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });

// Gallery — admin-only; uploading goes through lib/upload.ts (multipart, not JSON)
export interface GetGalleryParams {
  cursor?: string;
  limit?: number;
  q?: string;
  from?: string;
  to?: string;
}
export const getGallery = (tenantId: string, params: GetGalleryParams = {}) => {
  const search = new URLSearchParams({ tenantId });
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.q) search.set("q", params.q);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  return adminRequest<MediaPage>(`/media?${search.toString()}`);
};
export const updateMedia = (
  id: string,
  tenantId: string,
  input: { title?: string | null; tags?: string[] },
) =>
  adminRequest<MediaAsset>(`/media/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const deleteMedia = (id: string, tenantId: string) =>
  adminRequest<{ id: string }>(`/media/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });

// Payment methods
export const getPaymentMethods = (tenantId: string) =>
  request<PaymentMethod[]>(`/payment-methods?tenantId=${tenantId}`);
export const createPaymentMethod = (
  tenantId: string,
  input: Partial<PaymentMethod>,
) =>
  adminRequest<PaymentMethod>("/payment-methods", {
    method: "POST",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const updatePaymentMethod = (
  id: string,
  tenantId: string,
  input: Partial<PaymentMethod>,
) =>
  adminRequest<PaymentMethod>(`/payment-methods/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const deletePaymentMethod = (id: string, tenantId: string) =>
  adminRequest<{ id: string }>(`/payment-methods/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });

// Orders — list/detail/admin actions are admin-only; track/create are public
export const getOrders = (tenantId: string) =>
  adminRequest<Order[]>(`/orders?tenantId=${tenantId}`);
export const getOrder = (id: string, tenantId: string) =>
  adminRequest<Order>(`/orders/${id}?tenantId=${tenantId}`);
export const getOrderByToken = (token: string) =>
  request<Order>(`/orders/track/${token}`);
export const createOrder = (input: {
  tenantId: string;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  whatsappNumber?: string;
  deliveryAddress?: string;
  items: { productId: string; quantity: number }[];
}) => request<Order>("/orders", { method: "POST", body: JSON.stringify(input) });
export const markOrderSeen = (id: string, tenantId: string) =>
  adminRequest<Order>(`/orders/${id}/seen`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId }),
  });
export const updateOrderStatus = (
  id: string,
  tenantId: string,
  status: OrderStatus,
  note?: string,
) =>
  adminRequest<Order>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId, status, note }),
  });
export const reopenOrder = (id: string, tenantId: string) =>
  adminRequest<Order>(`/orders/${id}/reopen`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId }),
  });
export const modifyOrderItems = (
  id: string,
  tenantId: string,
  items: OrderItem[],
  note?: string,
) =>
  adminRequest<Order>(`/orders/${id}/items`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId, items, note }),
  });
export const addOrderUpdate = (id: string, tenantId: string, note: string) =>
  adminRequest<Order>(`/orders/${id}/updates`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId, note }),
  });
export const requestOrderBalance = (id: string, tenantId: string) =>
  adminRequest<Order>(`/orders/${id}/request-balance`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId }),
  });
export const markOrderBalancePaid = (id: string, tenantId: string) =>
  adminRequest<Order>(`/orders/${id}/balance-paid`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId }),
  });

// Team — entirely admin-only (OWNER)
export const getTeam = (tenantId: string) =>
  adminRequest<TeamMember[]>(`/team?tenantId=${tenantId}`);
export const inviteTeamMember = (
  tenantId: string,
  input: { name: string; email: string; role: string },
) =>
  adminRequest<TeamMember>("/team/invite", {
    method: "POST",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const removeTeamMember = (id: string, tenantId: string) =>
  adminRequest<{ id: string }>(`/team/${id}?tenantId=${tenantId}`, { method: "DELETE" });

// Support — the help/contact form (public, platform-level, not tenant-scoped)
export const submitSupportMessage = (input: {
  name: string;
  email: string;
  message: string;
  pageUrl?: string;
  tenantId?: string;
  honeypot?: string;
  formRenderedAt?: number;
}) =>
  request<{ id: string }>("/support/contact", {
    method: "POST",
    body: JSON.stringify(input),
  });

// Story page content blocks — public read, admin-only write
export const getStoryBlocks = (tenantId: string) =>
  request<ContentBlock[]>(`/story?tenantId=${tenantId}`);
export const updateStoryBlocks = (tenantId: string, blocks: ContentBlock[]) =>
  adminRequest<ContentBlock[]>("/story", {
    method: "PATCH",
    body: JSON.stringify({ tenantId, blocks }),
  });
