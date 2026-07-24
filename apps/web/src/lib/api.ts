import type {
  Collection,
  CollectionWithProducts,
  ContentBlock,
  MediaAsset,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
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
export const getTenant = () => request<Tenant>("/tenants/current");
export const updateTenantTheme = (themeTokens: ThemeTokens) =>
  request<Tenant>("/tenants/current/theme", {
    method: "PATCH",
    body: JSON.stringify(themeTokens),
  });

// Products
export const getProducts = () => request<Product[]>("/products");
export const getProduct = (idOrSlug: string) =>
  request<Product>(`/products/${idOrSlug}`);
export const createProduct = (input: Partial<Product>) =>
  request<Product>("/products", { method: "POST", body: JSON.stringify(input) });
export const updateProduct = (id: string, input: Partial<Product>) =>
  request<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deleteProduct = (id: string) =>
  request<{ id: string }>(`/products/${id}`, { method: "DELETE" });

// Collections
export const getCollections = () =>
  request<CollectionWithProducts[]>("/collections");
export const getCollection = (idOrSlug: string) =>
  request<CollectionWithProducts>(`/collections/${idOrSlug}`);
export const createCollection = (input: Partial<Collection>) =>
  request<Collection>("/collections", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateCollection = (id: string, input: Partial<Collection>) =>
  request<Collection>(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deleteCollection = (id: string) =>
  request<{ id: string }>(`/collections/${id}`, { method: "DELETE" });

// Gallery
export const getGallery = () => request<MediaAsset[]>("/media");
export const createMedia = (input: Partial<MediaAsset>) =>
  request<MediaAsset>("/media", { method: "POST", body: JSON.stringify(input) });
export const deleteMedia = (id: string) =>
  request<{ id: string }>(`/media/${id}`, { method: "DELETE" });

// Payment methods
export const getPaymentMethods = () =>
  request<PaymentMethod[]>("/payment-methods");
export const createPaymentMethod = (input: Partial<PaymentMethod>) =>
  request<PaymentMethod>("/payment-methods", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updatePaymentMethod = (id: string, input: Partial<PaymentMethod>) =>
  request<PaymentMethod>(`/payment-methods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deletePaymentMethod = (id: string) =>
  request<{ id: string }>(`/payment-methods/${id}`, { method: "DELETE" });

// Orders
export const getOrders = () => request<Order[]>("/orders");
export const getOrder = (id: string) => request<Order>(`/orders/${id}`);
export const getOrderByToken = (token: string) =>
  request<Order>(`/orders/track/${token}`);
export const createOrder = (input: {
  customerName: string;
  customerContact: string;
  items: OrderItem[];
}) => request<Order>("/orders", { method: "POST", body: JSON.stringify(input) });
export const updateOrderStatus = (
  id: string,
  status: OrderStatus,
  note?: string,
) =>
  request<Order>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
export const modifyOrderItems = (id: string, items: OrderItem[], note?: string) =>
  request<Order>(`/orders/${id}/items`, {
    method: "PATCH",
    body: JSON.stringify({ items, note }),
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
export const getStoryBlocks = () => request<ContentBlock[]>("/story");
export const updateStoryBlocks = (blocks: ContentBlock[]) =>
  request<ContentBlock[]>("/story", {
    method: "PATCH",
    body: JSON.stringify({ blocks }),
  });
