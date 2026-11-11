import { cache } from "react";
import type { Focus } from "./image-focus";
import type {
  AffiliateCapType,
  AffiliateEligibleProduct,
  AffiliateListing,
  AffiliateListingPage,
  AffiliateProductVisibility,
  AffiliatePublicSummary,
  AffiliateRelationship,
  CollectionInput,
  CollectionPage,
  CollectionWithProducts,
  ContentBlock,
  DomainStatus,
  MediaAsset,
  MediaPage,
  MediaUsage,
  BulkDeleteMediaResult,
  DropItem,
  DropItemInput,
  PhotoDropAdmin,
  PhotoDropLink,
  PhotoDropPublic,
  ProductSheetAdmin,
  ProductSheetLink,
  ProductSheetPublic,
  SheetChanges,
  SheetGalleryPhoto,
  SheetProductRow,
  SheetSuggestion,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PlanTier,
  Product,
  ProductPage,
  Tenant,
  TeamMember,
  ThemeTokens,
  UpgradeRequest,
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

const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);
const RETRYABLE_METHODS = new Set([undefined, "GET"]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// For public, unauthenticated reads/writes the storefront makes directly
// against the Nest API (product/collection listings, checkout, tracking).
// GETs are retried once on a transient gateway error (502/503/504) — a
// storefront page shouldn't hard-fail a visitor over a momentary blip
// upstream. Writes are never retried here since they aren't idempotent.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isRetryable = RETRYABLE_METHODS.has(init?.method?.toUpperCase());
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (res.ok) return res.json() as Promise<T>;
    if (!isRetryable || attempt > 0 || !TRANSIENT_STATUS_CODES.has(res.status)) {
      return parseFailure(path, res);
    }
    await sleep(300);
  }
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
  input: {
    name?: string;
    phoneNumber?: string | null;
    whatsappNumber?: string | null;
    logoUrl?: string | null;
  },
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
export const updateTenantContactSection = (
  tenantId: string,
  input: { contactEmail?: string | null; contactSectionVisible?: boolean },
) =>
  adminRequest<Tenant>(`/tenants/${tenantId}/contact-section`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const updateTenantStorefrontCopy = (
  tenantId: string,
  input: { heroTagline?: string; footerTagline?: string },
) =>
  adminRequest<Tenant>(`/tenants/${tenantId}/storefront-copy`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const updateAffiliateDisclosure = (tenantId: string, visible: boolean) =>
  adminRequest<Tenant>(`/tenants/${tenantId}/affiliate-disclosure`, {
    method: "PATCH",
    body: JSON.stringify({ visible }),
  });
export const updateBespokeRequests = (tenantId: string, enabled: boolean) =>
  adminRequest<Tenant>(`/tenants/${tenantId}/bespoke-requests`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
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
// includeAffiliate merges in active affiliate-listed products from shops
// that made this tenant an affiliate — pass true from storefront reads
// only; the admin product-management table stays native-only.
export const getProducts = (tenantId: string, includeAffiliate = false) =>
  request<Product[]>(
    `/products?tenantId=${tenantId}${includeAffiliate ? "&includeAffiliate=true" : ""}`,
  );
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
// One product's changes in the bulk editor — fields left out stay as they are.
export type BulkProductEdit = {
  id: string;
  title?: string;
  stock?: number;
  trackStock?: boolean;
  price?: number;
  discountPrice?: number | null;
  affiliatePrice?: number | null;
  sizes?: string[];
  colors?: string[];
  isActive?: boolean;
};
export const bulkUpdateProducts = (tenantId: string, updates: BulkProductEdit[]) =>
  adminRequest<{ products: Product[] }>("/products/bulk-update", {
    method: "POST",
    body: JSON.stringify({ tenantId, updates }),
  });
export const deleteProduct = (id: string, tenantId: string) =>
  adminRequest<{ id: string }>(`/products/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });

// Collections
export const getCollections = (tenantId: string, includeAffiliate = false) =>
  request<CollectionWithProducts[]>(
    `/collections?tenantId=${tenantId}${includeAffiliate ? "&includeAffiliate=true" : ""}`,
  );
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
export const getCollection = (
  idOrSlug: string,
  tenantId: string,
  includeAffiliate = false,
) =>
  request<CollectionWithProducts>(
    `/collections/${idOrSlug}?tenantId=${tenantId}${includeAffiliate ? "&includeAffiliate=true" : ""}`,
  );
export const createCollection = (tenantId: string, input: CollectionInput) =>
  adminRequest<CollectionWithProducts>("/collections", {
    method: "POST",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const updateCollection = (
  id: string,
  tenantId: string,
  input: CollectionInput,
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
  input: { title?: string | null; tags?: string[]; focus?: Focus | null },
) =>
  adminRequest<MediaAsset>(`/media/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, tenantId }),
  });
export const deleteMedia = (id: string, tenantId: string) =>
  adminRequest<{ id: string }>(`/media/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });
export const getMediaUsage = (ids: string[]) =>
  adminRequest<Record<string, MediaUsage[]>>("/media/usage", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
// Deletes only the photos that aren't in use; in-use ones come back in `skipped`.
// Sets (or clears, with null) the same focus point on many photos.
export const setMediaFocus = (ids: string[], focus: Focus | null) =>
  adminRequest<{ updated: number }>("/media/focus", {
    method: "POST",
    body: JSON.stringify({ ids, focus }),
  });

// Lets the server suggest a focus point for each photo (it only reads them).
export const suggestMediaFocus = (ids: string[]) =>
  adminRequest<{ updated: { id: string; focusX: number | null; focusY: number | null }[] }>(
    "/media/focus/suggest",
    { method: "POST", body: JSON.stringify({ ids }) },
  );

export const bulkDeleteMedia = (ids: string[]) =>
  adminRequest<BulkDeleteMediaResult>("/media/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });

// Product sheet — public (team link, by token)
const sheetPath = (token: string) => `/product-sheet/public/${encodeURIComponent(token)}`;
export const getProductSheet = (token: string) => request<ProductSheetPublic>(sheetPath(token));
export const getSheetProducts = (token: string, params: { cursor?: string | null; q?: string }) => {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.q) qs.set("q", params.q);
  return request<{ items: SheetProductRow[]; nextCursor: string | null }>(`${sheetPath(token)}/products?${qs}`);
};
export const getSheetGallery = (token: string, params: { cursor?: string | null; q?: string }) => {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.q) qs.set("q", params.q);
  return request<{ items: SheetGalleryPhoto[]; nextCursor: string | null }>(`${sheetPath(token)}/gallery?${qs}`);
};
// Returns null when the form matches the live product again (nothing to suggest).
export const saveSheetEdit = (token: string, productId: string, changes: SheetChanges, author: string) =>
  request<SheetSuggestion | null>(`${sheetPath(token)}/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify({ changes, author }),
  });
export const undoSheetEdit = (token: string, productId: string) =>
  request<{ ok: true }>(`${sheetPath(token)}/products/${productId}/undo`, { method: "POST" });
export const saveSheetNew = (token: string, id: string | null, changes: SheetChanges, author: string) =>
  request<SheetSuggestion>(id ? `${sheetPath(token)}/new/${id}` : `${sheetPath(token)}/new`, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify({ changes, author }),
  });
export const removeSheetNew = (token: string, id: string) =>
  request<{ ok: true }>(`${sheetPath(token)}/new/${id}/delete`, { method: "POST" });

// Product sheet — admin
export const getProductSheetAdmin = () => adminRequest<ProductSheetAdmin>("/product-sheet");
export const getProductSheetScopeProducts = () => adminRequest<Product[]>("/product-sheet/scope-products");
export const getProductSheetPendingCount = () =>
  adminRequest<{ count: number }>("/product-sheet/pending-count");
export const setProductSheetEnabled = (enabled: boolean) =>
  adminRequest<ProductSheetLink>("/product-sheet/link", {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
export const regenerateProductSheetLink = () =>
  adminRequest<ProductSheetLink>("/product-sheet/link/regenerate", { method: "POST" });
export const setProductSheetScope = (allProducts: boolean, productIds: string[]) =>
  adminRequest<{ allProducts: boolean; productIds: string[] }>("/product-sheet/scope", {
    method: "PUT",
    body: JSON.stringify({ allProducts, productIds }),
  });
export const publishSheetSuggestions = (ids: string[]) =>
  adminRequest<{ published: number; failed: { id: string; error: string }[] }>("/product-sheet/publish", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
export const discardSheetSuggestions = (ids: string[]) =>
  adminRequest<{ discarded: number }>("/product-sheet/discard", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });

// Photo Drop — public (team link, by token)
export const getPhotoDrop = (token: string) =>
  request<PhotoDropPublic>(`/photo-drop/public/${encodeURIComponent(token)}`);
export const updateDropItem = (token: string, id: string, input: DropItemInput) =>
  request<DropItem>(`/photo-drop/public/${encodeURIComponent(token)}/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const groupDropItems = (token: string, ids: string[]) =>
  request<DropItem>(`/photo-drop/public/${encodeURIComponent(token)}/items/group`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
export const removeDropItems = (token: string, ids: string[]) =>
  request<{ removed: number }>(`/photo-drop/public/${encodeURIComponent(token)}/items/delete`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });

export const setDropItemsUnavailable = (token: string, ids: string[], unavailable: boolean) =>
  request<{ updated: number }>(`/photo-drop/public/${encodeURIComponent(token)}/items/unavailable`, {
    method: "POST",
    body: JSON.stringify({ ids, unavailable }),
  });

export const removeDropItemPhoto = (token: string, itemId: string, photoId: string) =>
  request<DropItem>(
    `/photo-drop/public/${encodeURIComponent(token)}/items/${itemId}/photos/${photoId}/delete`,
    { method: "POST" },
  );

// Photo Drop — admin
export const getPhotoDropAdmin = () => adminRequest<PhotoDropAdmin>("/photo-drop");
export const setPhotoDropEnabled = (enabled: boolean) =>
  adminRequest<PhotoDropLink>("/photo-drop/link", {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
export const regeneratePhotoDropLink = () =>
  adminRequest<PhotoDropLink>("/photo-drop/link/regenerate", { method: "POST" });
export const adminRemoveDropItems = (ids: string[]) =>
  adminRequest<{ removed: number }>("/photo-drop/items/delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
export const clearPhotoDrop = () =>
  adminRequest<{ removed: number }>("/photo-drop/items/clear", { method: "POST" });
// Hands gallery photos to the team: one item per photo, or one item for all.
export const sendGalleryToDrop = (ids: string[], asOne: boolean) =>
  adminRequest<{ added: number; skipped: number }>("/photo-drop/items/from-gallery", {
    method: "POST",
    body: JSON.stringify({ ids, asOne }),
  });
export const dropItemsToGallery = (ids: string[]) =>
  adminRequest<{ added: number }>("/photo-drop/items/to-gallery", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
// Creates one product from drop items and moves their photos to the gallery.
export const createProductFromDrop = (ids: string[], product: Partial<Product>) =>
  adminRequest<Product>("/photo-drop/items/to-product", {
    method: "POST",
    body: JSON.stringify({ ids, product }),
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
export const cancelOrderByToken = (token: string, paymentReference: string) =>
  request<Order>(`/orders/track/${token}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ paymentReference }),
  });
export const createOrder = (input: {
  tenantId: string;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  whatsappNumber?: string;
  deliveryAddress?: string;
  items: {
    productId: string;
    quantity: number;
    size?: string | null;
    color?: string | null;
  }[];
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
export const createManualOrder = (input: {
  customerName: string;
  customerContact?: string;
  customerEmail?: string;
  status: "CONFIRMED" | "COMPLETED";
  orderedAt?: string;
  note?: string;
  items: {
    productId: string;
    quantity: number;
    price?: number;
    size?: string | null;
    color?: string | null;
  }[];
}) =>
  adminRequest<Order>("/orders/manual", {
    method: "POST",
    body: JSON.stringify(input),
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
  // "platform" (default) = the site's Help/Support form; "biibisoft" = the
  // storefront footer's "Contact the Biibisoft team" entry point.
  audience?: "platform" | "biibisoft";
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

// Public — feeds SiteFooter with a tenant's own affiliate relationships,
// gated server-side by that tenant's own disclosure setting.
export const getAffiliatePublicSummary = (tenantId: string) =>
  request<AffiliatePublicSummary>(`/affiliates/public-summary/${tenantId}`);

// Affiliates — entirely admin-only. Reads used from client components
// (e.g. after a mutation, via router.refresh() + re-fetch) go through
// adminRequest here; a Server Component's *initial* render instead uses
// lib/api-server.ts, same split as Team/Orders.
export const inviteAffiliate = (
  tenantId: string,
  input: { affiliateSlug: string; capType: AffiliateCapType; capValue: number },
) =>
  adminRequest<AffiliateRelationship>(`/affiliates/invite?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const getOutgoingAffiliates = (tenantId: string) =>
  adminRequest<AffiliateRelationship[]>(`/affiliates/outgoing?tenantId=${tenantId}`);
export const getIncomingAffiliates = (tenantId: string) =>
  adminRequest<AffiliateRelationship[]>(`/affiliates/incoming?tenantId=${tenantId}`);
export const acceptAffiliate = (id: string, tenantId: string) =>
  adminRequest<AffiliateRelationship>(`/affiliates/${id}/accept?tenantId=${tenantId}`, {
    method: "PATCH",
  });
export const declineAffiliate = (id: string, tenantId: string) =>
  adminRequest<AffiliateRelationship>(`/affiliates/${id}/decline?tenantId=${tenantId}`, {
    method: "PATCH",
  });
export const terminateAffiliate = (id: string, tenantId: string) =>
  adminRequest<AffiliateRelationship>(`/affiliates/${id}/terminate?tenantId=${tenantId}`, {
    method: "PATCH",
  });
export const getAffiliateEligibleProducts = (id: string, tenantId: string) =>
  adminRequest<AffiliateEligibleProduct[]>(
    `/affiliates/${id}/eligible-products?tenantId=${tenantId}`,
  );
export const exemptAffiliateProduct = (id: string, tenantId: string, productId: string) =>
  adminRequest<{ id: string }>(
    `/affiliates/${id}/exemptions/${productId}?tenantId=${tenantId}`,
    { method: "POST" },
  );
export const unexemptAffiliateProduct = (id: string, tenantId: string, productId: string) =>
  adminRequest<{ id: string }>(
    `/affiliates/${id}/exemptions/${productId}?tenantId=${tenantId}`,
    { method: "DELETE" },
  );
// The product-editing-pane counterpart to the exemption endpoints above —
// one product, every affiliate at once.
export const getAffiliateProductVisibility = (productId: string, tenantId: string) =>
  adminRequest<AffiliateProductVisibility>(
    `/affiliates/products/${productId}/visibility?tenantId=${tenantId}`,
  );
export const setAffiliateProductVisibility = (
  productId: string,
  tenantId: string,
  input: AffiliateProductVisibility,
) =>
  adminRequest<AffiliateProductVisibility>(
    `/affiliates/products/${productId}/visibility?tenantId=${tenantId}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
export const getAffiliateListings = (id: string, tenantId: string) =>
  adminRequest<AffiliateListing[]>(`/affiliates/${id}/listings?tenantId=${tenantId}`);
// Cursor-paginated + searchable variant — for picking from a
// potentially large catalog (e.g. AffiliateCollectionItemsManager)
// without ever loading the whole thing at once.
export interface GetAffiliateListingsPageParams {
  cursor?: string;
  limit?: number;
  q?: string;
}
export const getAffiliateListingsPage = (
  id: string,
  tenantId: string,
  params: GetAffiliateListingsPageParams = {},
) => {
  const search = new URLSearchParams({ tenantId, paginate: "true" });
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.q) search.set("q", params.q);
  return adminRequest<AffiliateListingPage>(`/affiliates/${id}/listings?${search.toString()}`);
};
// Same shape as getAffiliateListingsPage, but merged across every shop the
// caller resells for at once — the affiliate products page, as opposed to
// picking from one relationship at a time.
export interface GetMyAffiliateListingsPageParams {
  cursor?: string;
  limit?: number;
  q?: string;
  relationshipId?: string;
}
export const getMyAffiliateListingsPage = (
  tenantId: string,
  params: GetMyAffiliateListingsPageParams = {},
) => {
  const search = new URLSearchParams({ tenantId });
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.q) search.set("q", params.q);
  if (params.relationshipId) search.set("relationshipId", params.relationshipId);
  return adminRequest<AffiliateListingPage>(`/affiliates/my-listings?${search.toString()}`);
};
export const setAffiliateListingPrice = (
  id: string,
  tenantId: string,
  productId: string,
  price: number,
) =>
  adminRequest<AffiliateListing>(
    `/affiliates/${id}/listings/${productId}?tenantId=${tenantId}`,
    { method: "PATCH", body: JSON.stringify({ price }) },
  );
export const toggleAffiliateListing = (
  id: string,
  tenantId: string,
  productId: string,
  isActive: boolean,
) =>
  adminRequest<{ id: string; isActive: boolean }>(
    `/affiliates/${id}/listings/${productId}/toggle?tenantId=${tenantId}`,
    { method: "PATCH", body: JSON.stringify({ isActive }) },
  );
export const addAffiliateCollectionItem = (
  id: string,
  tenantId: string,
  collectionId: string,
  productId: string,
) =>
  adminRequest<{ id: string }>(
    `/affiliates/${id}/collections/${collectionId}/items/${productId}?tenantId=${tenantId}`,
    { method: "POST" },
  );
export const removeAffiliateCollectionItem = (
  id: string,
  tenantId: string,
  collectionId: string,
  productId: string,
) =>
  adminRequest<{ id: string }>(
    `/affiliates/${id}/collections/${collectionId}/items/${productId}?tenantId=${tenantId}`,
    { method: "DELETE" },
  );

// Billing — submitting an upgrade request (client-side, from the dialog's
// button click). Reading platform payment methods/message/request history
// on a Server Component's initial render goes through lib/api-server.ts
// instead — see that file's comment for why adminRequest() can't be used
// there.
export const submitUpgradeRequest = (requestedPlan: PlanTier, referenceNote: string) =>
  adminRequest<UpgradeRequest>("/billing/requests", {
    method: "POST",
    body: JSON.stringify({ requestedPlan, referenceNote }),
  });
