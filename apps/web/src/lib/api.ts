import { cache } from "react";
import type {
  Collection,
  CollectionPage,
  CollectionWithProducts,
  ContentBlock,
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${body}`);
  }
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
export const updateTenantTheme = (tenantId: string, themeTokens: ThemeTokens) =>
  request<Tenant>(`/tenants/${tenantId}/theme`, {
    method: "PATCH",
    body: JSON.stringify(themeTokens),
  });

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
  request<Product>("/products", {
    method: "POST",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const updateProduct = (
  id: string,
  tenantId: string,
  input: Partial<Product>,
) =>
  request<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const deleteProduct = (id: string, tenantId: string) =>
  request<{ id: string }>(`/products/${id}?tenantId=${tenantId}`, {
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
  request<CollectionWithProducts>("/collections", {
    method: "POST",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const updateCollection = (
  id: string,
  tenantId: string,
  input: Partial<Collection>,
) =>
  request<CollectionWithProducts>(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const deleteCollection = (id: string, tenantId: string) =>
  request<{ id: string }>(`/collections/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });

// Gallery — uploading goes through lib/upload.ts (multipart, not JSON)
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
  return request<MediaPage>(`/media?${search.toString()}`);
};
export const updateMedia = (
  id: string,
  tenantId: string,
  input: { title?: string | null; tags?: string[] },
) =>
  request<MediaAsset>(`/media/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const deleteMedia = (id: string, tenantId: string) =>
  request<{ id: string }>(`/media/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });

// Payment methods
export const getPaymentMethods = (tenantId: string) =>
  request<PaymentMethod[]>(`/payment-methods?tenantId=${tenantId}`);
export const createPaymentMethod = (
  tenantId: string,
  input: Partial<PaymentMethod>,
) =>
  request<PaymentMethod>("/payment-methods", {
    method: "POST",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const updatePaymentMethod = (
  id: string,
  tenantId: string,
  input: Partial<PaymentMethod>,
) =>
  request<PaymentMethod>(`/payment-methods/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const deletePaymentMethod = (id: string, tenantId: string) =>
  request<{ id: string }>(`/payment-methods/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });

// Orders
export const getOrders = (tenantId: string) =>
  request<Order[]>(`/orders?tenantId=${tenantId}`);
export const getOrder = (id: string, tenantId: string) =>
  request<Order>(`/orders/${id}?tenantId=${tenantId}`);
export const getOrderByToken = (token: string) =>
  request<Order>(`/orders/track/${token}`);
export const createOrder = (input: {
  tenantId: string;
  customerName: string;
  customerContact: string;
  items: { productId: string; quantity: number }[];
}) => request<Order>("/orders", { method: "POST", body: JSON.stringify(input) });
export const markOrderSeen = (id: string, tenantId: string) =>
  request<Order>(`/orders/${id}/seen`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId }),
  });
export const updateOrderStatus = (
  id: string,
  tenantId: string,
  status: OrderStatus,
  note?: string,
) =>
  request<Order>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId, status, note }),
  });
export const modifyOrderItems = (
  id: string,
  tenantId: string,
  items: OrderItem[],
  note?: string,
) =>
  request<Order>(`/orders/${id}/items`, {
    method: "PATCH",
    body: JSON.stringify({ tenantId, items, note }),
  });

// Team
export const getTeam = () => request<TeamMember[]>("/team");
export const inviteTeamMember = (input: {
  name: string;
  email: string;
  role: string;
}) => request<TeamMember>("/team/invite", {
  method: "POST",
  body: JSON.stringify(input),
});
export const removeTeamMember = (id: string) =>
  request<{ id: string }>(`/team/${id}`, { method: "DELETE" });

// Story page content blocks
export const getStoryBlocks = (tenantId: string) =>
  request<ContentBlock[]>(`/story?tenantId=${tenantId}`);
export const updateStoryBlocks = (tenantId: string, blocks: ContentBlock[]) =>
  request<ContentBlock[]>("/story", {
    method: "PATCH",
    body: JSON.stringify({ tenantId, blocks }),
  });
