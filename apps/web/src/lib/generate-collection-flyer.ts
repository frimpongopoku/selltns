import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { getCanonicalUrl } from "./canonical";
import { formatMoney } from "./format";
import { discountedPrice, isOnSale } from "./pricing";
import type { Tenant, Product } from "./types";

// A shareable "collection flyer": shop branding + a QR code back to the
// collection up top, a numbered product grid (photo, name, price) below.
// Rendered entirely on a <canvas> — same approach as generate-shop-qr.ts
// and generate-fulfillment-label.ts, and for the same reason: an earlier
// attempt to composite real product photos via Satori/next-og broke WebP
// decoding in production, and the sharp-based fix for that broke the
// Vercel build entirely (missing native libvips). Plain Canvas2D decodes
// WebP fine through the browser's own <img> decoder, so it's the only
// proven-safe way to do this.
// Canvas width is fixed; height adapts to how many product rows there are
// (computed in renderCollectionFlyer) so a 2-product flyer isn't stretched
// with a huge empty gap before the footer the way a fixed-height canvas
// would leave it.
const FLYER_W = 1080;
const MARGIN = 56;
const FONT_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MAX_PRODUCTS = 6;
const GRID_COLS = 3;
// The whole layout below is written in "logical" pixels (FLYER_W = 1080
// logical px) — the actual exported canvas is PIXEL_RATIO times larger in
// each dimension, with the drawing context scaled up to match, so every
// coordinate/font-size stays valid while the real output (what gets
// exported as PNG/PDF) is sharp at 2x, not blurry at a flat 1080px.
const PIXEL_RATIO = 2;

export interface FlyerProductInput {
  id: string;
  title: string;
  price: number;
  discountPrice: number | null;
  image: string | null;
}

export function flyerProductFromProduct(product: Product): FlyerProductInput {
  return {
    id: product.id,
    title: product.title,
    price: product.price,
    discountPrice: product.discountPrice,
    image: product.images[0] ?? null,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

// Same-origin proxy for the same reason logoProxyUrl exists in
// generate-fulfillment-label.ts — the R2 public domain sends no CORS
// headers, so a direct crossOrigin="anonymous" load fails silently.
// /api/favicon only proxies a tenant's own logo; this generalizes that to
// any of our own media URLs (product photos included), validated
// server-side against the same allowlist next.config.ts trusts for
// next/image (see app/api/media-proxy/route.ts).
function mediaProxyUrl(url: string): string {
  return `/api/media-proxy?url=${encodeURIComponent(url)}`;
}

function logoProxyUrl(tenant: Tenant): string {
  return `/api/favicon?slug=${encodeURIComponent(tenant.slug)}`;
}

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Like drawImageCover, but fits the whole image inside the box instead of
// cropping to fill it (CSS object-fit: contain) — used for product photos
// so an oddly-shaped item (e.g. a wide hat, a tall dress) isn't cropped
// away, letterboxing with `bg` on whichever axis has leftover space.
function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: string,
) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let dw = w;
  let dh = h;
  if (imgRatio > boxRatio) {
    dh = w / imgRatio;
  } else {
    dw = h * imgRatio;
  }
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ctx.fillText has no ellipsis/truncation of its own — trims one character
// at a time (rare for a product title, so the O(n) cost never matters in
// practice) until it fits `maxWidth`, appending "…" only if it had to cut.
function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function drawStrikethrough(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const width = ctx.measureText(text).width;
  ctx.fillText(text, x, y);
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const lineY = y - 6;
  const startX = ctx.textAlign === "center" ? x - width / 2 : x;
  ctx.moveTo(startX, lineY);
  ctx.lineTo(startX + width, lineY);
  ctx.stroke();
  ctx.restore();
}

// Rendered at `size * PIXEL_RATIO` actual pixels so it stays crisp when
// drawn into the (also upscaled) main canvas at its logical `size` — see
// PIXEL_RATIO's comment below.
async function drawQr(url: string, size: number): Promise<HTMLCanvasElement> {
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, url, {
    width: size * PIXEL_RATIO,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#111111ff", light: "#ffffffff" },
  });
  return qrCanvas;
}

export interface RenderFlyerInput {
  tenant: Tenant;
  collectionTitle: string;
  collectionSlug: string;
  themeOverride?: Tenant["themeTokens"] | null;
  products: FlyerProductInput[];
}

export async function renderCollectionFlyer(input: RenderFlyerInput): Promise<HTMLCanvasElement> {
  const { tenant, collectionTitle, collectionSlug } = input;
  const products = input.products.slice(0, MAX_PRODUCTS);
  const tokens = input.themeOverride ?? tenant.themeTokens;
  const accent = tokens?.primary || "#1a1a1a";
  const url = getCanonicalUrl(tenant, `/collections/${collectionSlug}`);

  // Layout is computed up front (before the canvas exists) so the canvas
  // height can adapt to the actual row count — a fixed height would leave
  // either a cramped grid (6 products) or a big awkward gap before the
  // footer (1-3 products).
  const headerTop = 46;
  const logoSize = 76;
  const titleY = headerTop + logoSize + 66;
  const gridTop = titleY + 46;
  const gap = 22;
  const cellW = (FLYER_W - MARGIN * 2 - gap * (GRID_COLS - 1)) / GRID_COLS;
  const cellPhotoH = cellW;
  const cellTextH = 66;
  const cellH = cellPhotoH + cellTextH;
  const rows = Math.ceil(products.length / GRID_COLS);
  const gridHeight = rows * cellH + (rows - 1) * gap;
  const footerGap = 40;
  const footerH = 130;
  const flyerH = gridTop + gridHeight + footerGap + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = FLYER_W * PIXEL_RATIO;
  canvas.height = flyerH * PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  // Background + accent top bar.
  ctx.fillStyle = "#fbfaf8";
  ctx.fillRect(0, 0, FLYER_W, flyerH);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, FLYER_W, 10);

  // --- Header: logo + shop name (left), QR + shop-now (right) ---
  let textX = MARGIN;

  if (tenant.logoUrl) {
    try {
      const logo = await loadImage(logoProxyUrl(tenant));
      ctx.save();
      roundedRectPath(ctx, MARGIN, headerTop, logoSize, logoSize, 14);
      ctx.clip();
      drawImageCover(ctx, logo, MARGIN, headerTop, logoSize, logoSize);
      ctx.restore();
      textX = MARGIN + logoSize + 20;
    } catch {
      // No logo badge if it can't load — plain text header instead.
    }
  }

  const qrSize = 118;
  const qrX = FLYER_W - MARGIN - qrSize;
  const nameMaxWidth = qrX - 24 - textX;

  ctx.textAlign = "left";
  ctx.fillStyle = "#111111";
  ctx.font = `800 34px ${FONT_STACK}`;
  ctx.fillText(
    truncateToWidth(ctx, tenant.name, nameMaxWidth),
    textX,
    headerTop + logoSize / 2 - 6,
  );
  if (tenant.footerTagline) {
    ctx.fillStyle = "#6b7280";
    ctx.font = `500 18px ${FONT_STACK}`;
    ctx.fillText(
      truncateToWidth(ctx, tenant.footerTagline, nameMaxWidth),
      textX,
      headerTop + logoSize / 2 + 22,
    );
  }

  const qrCanvas = await drawQr(url, qrSize);
  ctx.save();
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, qrX - 8, headerTop - 8, qrSize + 16, qrSize + 16, 12);
  ctx.stroke();
  ctx.restore();
  ctx.drawImage(qrCanvas, qrX, headerTop, qrSize, qrSize);

  const pillY = headerTop + qrSize + 18;
  const pillW = qrSize + 16;
  const pillH = 34;
  const pillX = qrX - 8;
  ctx.fillStyle = accent;
  roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 15px ${FONT_STACK}`;
  ctx.fillText("SHOP NOW", pillX + pillW / 2, pillY + pillH / 2 + 5);
  // The URL itself lives in the footer only (below) — showing it a second
  // time here too, right where the product grid starts, was overlapping
  // the top row of photos.

  // --- Collection title, as the flyer's headline ---
  ctx.textAlign = "left";
  ctx.fillStyle = "#111111";
  ctx.font = `800 40px ${FONT_STACK}`;
  ctx.fillText(truncateToWidth(ctx, collectionTitle, FLYER_W - MARGIN * 2), MARGIN, titleY);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(MARGIN, titleY + 18);
  ctx.lineTo(MARGIN + 64, titleY + 18);
  ctx.stroke();

  // --- Product grid ---
  for (let i = 0; i < products.length; i++) {
    const row = Math.floor(i / GRID_COLS);
    const itemsInRow = Math.min(GRID_COLS, products.length - row * GRID_COLS);
    const rowWidth = itemsInRow * cellW + (itemsInRow - 1) * gap;
    const rowStartX = MARGIN + (FLYER_W - MARGIN * 2 - rowWidth) / 2;
    const col = i - row * GRID_COLS;

    const cellX = rowStartX + col * (cellW + gap);
    const cellY = gridTop + row * (cellH + gap);
    const product = products[i];

    ctx.save();
    roundedRectPath(ctx, cellX, cellY, cellW, cellPhotoH, 16);
    ctx.clip();
    if (product.image) {
      try {
        const img = await loadImage(mediaProxyUrl(product.image));
        drawImageContain(ctx, img, cellX, cellY, cellW, cellPhotoH, "#ffffff");
      } catch {
        ctx.fillStyle = "#e5e7eb";
        ctx.fillRect(cellX, cellY, cellW, cellPhotoH);
      }
    } else {
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(cellX, cellY, cellW, cellPhotoH);
    }
    ctx.restore();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;
    roundedRectPath(ctx, cellX, cellY, cellW, cellPhotoH, 16);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Numbered badge.
    const badgeR = 20;
    const badgeCx = cellX + badgeR + 10;
    const badgeCy = cellY + badgeR + 10;
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 16px ${FONT_STACK}`;
    ctx.fillText(String(i + 1).padStart(2, "0"), badgeCx, badgeCy + 5);

    // Name.
    const textY = cellY + cellPhotoH + 24;
    ctx.textAlign = "left";
    ctx.fillStyle = "#111111";
    ctx.font = `700 18px ${FONT_STACK}`;
    ctx.fillText(truncateToWidth(ctx, product.title, cellW), cellX, textY);

    // Price — struck-through regular price + accent sale price when on sale.
    const priceY = textY + 26;
    ctx.font = `600 16px ${FONT_STACK}`;
    if (isOnSale(product)) {
      ctx.fillStyle = "#9ca3af";
      const regular = formatMoney(product.price);
      const regularWidth = ctx.measureText(regular).width;
      drawStrikethrough(ctx, regular, cellX, priceY);
      ctx.fillStyle = accent;
      ctx.font = `700 16px ${FONT_STACK}`;
      ctx.fillText(formatMoney(discountedPrice(product)), cellX + regularWidth + 10, priceY);
    } else {
      ctx.fillStyle = "#111111";
      ctx.fillText(formatMoney(product.price), cellX, priceY);
    }
  }

  // --- Footer ---
  const footerTop = flyerH - footerH;
  ctx.fillStyle = accent;
  ctx.fillRect(0, footerTop, FLYER_W, footerH);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 22px ${FONT_STACK}`;
  ctx.fillText(prettyUrl(getCanonicalUrl(tenant)), FLYER_W / 2, footerTop + 50);
  ctx.globalAlpha = 0.85;
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.fillText(
    `Scan the code or visit the link above to shop “${collectionTitle}”`,
    FLYER_W / 2,
    footerTop + 78,
  );
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.6;
  ctx.font = `500 13px ${FONT_STACK}`;
  ctx.fillText("Powered by Selltns", FLYER_W / 2, footerTop + footerH - 18);
  ctx.globalAlpha = 1;

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the flyer image."));
    }, "image/png");
  });
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getCollectionFlyerPngBlob(input: RenderFlyerInput): Promise<Blob> {
  const canvas = await renderCollectionFlyer(input);
  return canvasToBlob(canvas);
}

export async function downloadCollectionFlyerPng(input: RenderFlyerInput): Promise<void> {
  const blob = await getCollectionFlyerPngBlob(input);
  triggerBlobDownload(blob, `${input.tenant.slug}-${input.collectionSlug}-flyer.png`);
}

export async function downloadCollectionFlyerPdf(input: RenderFlyerInput): Promise<void> {
  const canvas = await renderCollectionFlyer(input);
  const dataUrl = canvas.toDataURL("image/png");
  // jsPDF's unit: "px" has a long-standing scale mismatch between the page
  // format and addImage's coordinates (needs the "px_scaling" hotfix to
  // behave, and even then isn't worth relying on) — generate-fulfillment-
  // label.ts sidesteps the whole issue by working in inches instead, so do
  // the same here: treat the canvas's actual pixels as 96dpi and convert.
  const DPI = 96;
  const widthIn = canvas.width / DPI;
  const heightIn = canvas.height / DPI;
  // Without an explicit orientation, jsPDF defaults to "portrait" and
  // silently swaps a landscape-shaped [w, h] format to fit that (verified
  // directly: new jsPDF({ format: [22.5, 16.2] }) reports a page of
  // 16.2 x 22.5) — while addImage below still draws at the original,
  // now-too-wide dimensions. That's what was cutting the right side off
  // and leaving empty space at the bottom.
  const orientation = widthIn >= heightIn ? "landscape" : "portrait";
  const doc = new jsPDF({ unit: "in", format: [widthIn, heightIn], orientation });
  doc.addImage(dataUrl, "PNG", 0, 0, widthIn, heightIn);
  doc.save(`${input.tenant.slug}-${input.collectionSlug}-flyer.pdf`);
}
