import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { getCanonicalUrl } from "./canonical";
import { formatMoney } from "./format";
import { discountedPrice, isOnSale } from "./pricing";
import type { Tenant, Product } from "./types";

// Two shareable "product flyer" templates: shop branding + a QR code back
// to the product, price (discount-aware), and a photo. Same rendering
// approach as generate-collection-flyer.ts (and for the same reason — see
// that file's header comment for the Satori/sharp production breakages
// this deliberately avoids): plain Canvas2D, product photos loaded
// through the same-origin media proxy since the R2 domain sends no CORS
// headers.
export type ProductFlyerTemplate = "classic" | "bold";

const FLYER_W = 1080;
const MARGIN = 56;
const FONT_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
// See generate-collection-flyer.ts's PIXEL_RATIO comment — same reasoning:
// layout math below is all in logical 1080-wide px, the real canvas is
// this many times larger with the context scaled to match, so the export
// is sharp rather than blurry at a flat 1080px.
const PIXEL_RATIO = 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

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

// Fits the whole image inside the box (CSS object-fit: contain) rather
// than cropping to fill it, so an oddly-shaped product isn't cut off —
// letterboxes with `bg` on whichever axis has leftover space.
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

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

// Wraps `text` onto lines no wider than `maxWidth`, stopping after
// `maxLines` and ellipsizing the last one if there's more left over —
// used for the product description, which unlike a title can run to a
// full sentence or two.
function wrapToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines) {
    lines[maxLines - 1] = truncateToWidth(ctx, lines[maxLines - 1], maxWidth);
  }
  return lines;
}

function drawStrikethrough(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const width = ctx.measureText(text).width;
  ctx.fillText(text, x, y);
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const lineY = y - 10;
  const startX = ctx.textAlign === "center" ? x - width / 2 : x;
  ctx.moveTo(startX, lineY);
  ctx.lineTo(startX + width, lineY);
  ctx.stroke();
  ctx.restore();
}

/* Only used by the disabled "bold" template — see the block comment below.
// Canvas text has no letter-spacing property — draws one character at a
// time with `gap` extra px between them. Used for the small-caps eyebrow
// label and the footer shop name, both of which read better spaced out.
function fillTextSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  gap: number,
  align: "left" | "center" | "right",
) {
  const priorAlign = ctx.textAlign;
  ctx.textAlign = "left";
  const chars = text.split("");
  const totalWidth = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width + gap, -gap);
  let startX = x;
  if (align === "center") startX = x - totalWidth / 2;
  else if (align === "right") startX = x - totalWidth;
  let cursor = startX;
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + gap;
  }
  ctx.textAlign = priorAlign;
  return totalWidth;
}
*/

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

/* Only used by the disabled "bold" template — see the block comment below.
function drawHeartOutline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  filled: boolean,
) {
  ctx.save();
  const top = cy - size * 0.32;
  ctx.beginPath();
  ctx.moveTo(cx, top + size * 0.32);
  ctx.bezierCurveTo(cx, top, cx - size / 2, top, cx - size / 2, top + size * 0.32);
  ctx.bezierCurveTo(
    cx - size / 2,
    top + size * 0.66,
    cx,
    top + size * 0.8,
    cx,
    top + size,
  );
  ctx.bezierCurveTo(
    cx,
    top + size * 0.8,
    cx + size / 2,
    top + size * 0.66,
    cx + size / 2,
    top + size * 0.32,
  );
  ctx.bezierCurveTo(cx + size / 2, top, cx, top, cx, top + size * 0.32);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
}
*/

export interface FlyerProductInput {
  title: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  image: string | null;
  sku: string;
  stock: number;
  trackStock: boolean;
  preorder: boolean;
  /** Feature label for the "bold" template's category tag — falls back to
   * the shop name when there isn't one. */
  category?: string | null;
}

export function flyerProductFromProduct(product: Product, image?: string | null): FlyerProductInput {
  return {
    title: product.title,
    slug: product.slug,
    description: product.description,
    price: product.price,
    discountPrice: product.discountPrice,
    image: image !== undefined ? image : (product.images[0] ?? null),
    sku: product.sku,
    stock: product.stock,
    trackStock: product.trackStock,
    preorder: Boolean(product.preorder),
    category: product.tags[0] ?? null,
  };
}

export interface RenderProductFlyerInput {
  tenant: Tenant;
  product: FlyerProductInput;
  template?: ProductFlyerTemplate;
  /** "bold" template only — a short handwritten-style accent phrase. */
  tagline?: string;
}

export async function renderProductFlyer(input: RenderProductFlyerInput): Promise<HTMLCanvasElement> {
  // "bold" is disabled for now (design didn't meet the bar) — commented
  // out below rather than deleted, pending a revisit. Falls back to
  // classic for any input still requesting it.
  return renderClassicProductFlyer(input);
}

async function renderClassicProductFlyer(input: RenderProductFlyerInput): Promise<HTMLCanvasElement> {
  const { tenant, product } = input;
  const accent = tenant.themeTokens?.primary || "#1a1a1a";
  const url = getCanonicalUrl(tenant, `/products/${product.slug}`);

  const canvas = document.createElement("canvas");
  const FLYER_H = 1350;
  canvas.width = FLYER_W * PIXEL_RATIO;
  canvas.height = FLYER_H * PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  // Background + accent top bar.
  ctx.fillStyle = "#fbfaf8";
  ctx.fillRect(0, 0, FLYER_W, FLYER_H);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, FLYER_W, 10);

  // --- Header: logo + shop name (left), QR + shop-now (right) ---
  const headerTop = 46;
  const logoSize = 76;
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
  ctx.fillText(truncateToWidth(ctx, tenant.name, nameMaxWidth), textX, headerTop + logoSize / 2 - 6);
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

  // --- Product title, as the flyer's headline ---
  const titleY = headerTop + logoSize + 66;
  ctx.textAlign = "left";
  ctx.fillStyle = "#111111";
  ctx.font = `800 38px ${FONT_STACK}`;
  ctx.fillText(truncateToWidth(ctx, product.title, FLYER_W - MARGIN * 2), MARGIN, titleY);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(MARGIN, titleY + 18);
  ctx.lineTo(MARGIN + 64, titleY + 18);
  ctx.stroke();

  // --- Hero photo ---
  const heroTop = titleY + 46;
  const footerH = 130;
  const footerGap = 40;
  const priceBlockH = 66;
  const descriptionH = product.description ? 56 : 0;
  const heroBottom = FLYER_H - footerH - footerGap - priceBlockH - descriptionH;
  const heroW = FLYER_W - MARGIN * 2;
  const heroH = heroBottom - heroTop;

  ctx.save();
  roundedRectPath(ctx, MARGIN, heroTop, heroW, heroH, 20);
  ctx.clip();
  if (product.image) {
    try {
      const img = await loadImage(mediaProxyUrl(product.image));
      drawImageContain(ctx, img, MARGIN, heroTop, heroW, heroH, "#ffffff");
    } catch {
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(MARGIN, heroTop, heroW, heroH);
    }
  } else {
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(MARGIN, heroTop, heroW, heroH);
  }
  ctx.restore();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, MARGIN, heroTop, heroW, heroH, 20);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // --- Price — struck-through regular price + accent sale price when on sale. ---
  const priceY = heroBottom + 50;
  ctx.textAlign = "left";
  if (isOnSale(product)) {
    ctx.font = `600 24px ${FONT_STACK}`;
    ctx.fillStyle = "#9ca3af";
    const regular = formatMoney(product.price);
    const regularWidth = ctx.measureText(regular).width;
    drawStrikethrough(ctx, regular, MARGIN, priceY);
    ctx.fillStyle = accent;
    ctx.font = `800 34px ${FONT_STACK}`;
    ctx.fillText(formatMoney(discountedPrice(product)), MARGIN + regularWidth + 16, priceY + 4);
  } else {
    ctx.fillStyle = accent;
    ctx.font = `800 34px ${FONT_STACK}`;
    ctx.fillText(formatMoney(product.price), MARGIN, priceY);
  }

  // --- Short description, if there is one ---
  if (product.description) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#4b5563";
    ctx.font = `500 18px ${FONT_STACK}`;
    const lines = wrapToLines(ctx, product.description, heroW, 2);
    lines.forEach((line, i) => {
      ctx.fillText(line, MARGIN, priceY + 34 + i * 26);
    });
  }

  // --- Footer ---
  const footerTop = FLYER_H - footerH;
  ctx.fillStyle = accent;
  ctx.fillRect(0, footerTop, FLYER_W, footerH);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 22px ${FONT_STACK}`;
  ctx.fillText(prettyUrl(getCanonicalUrl(tenant)), FLYER_W / 2, footerTop + 50);
  ctx.globalAlpha = 0.85;
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.fillText(
    `Scan the code or visit the link above to shop “${product.title}”`,
    FLYER_W / 2,
    footerTop + 78,
  );
  ctx.globalAlpha = 1;
  ctx.globalAlpha = 0.6;
  ctx.font = `500 13px ${FONT_STACK}`;
  ctx.fillText("Powered by Selltns", FLYER_W / 2, footerTop + footerH - 18);
  ctx.globalAlpha = 1;

  return canvas;
}

/* Disabled for now — design didn't meet the bar, revisit later.
// "Bold" template: an editorial two-column layout modeled on a reference
// HTML flyer the user supplied — a big photo card (with soft accent
// circles peeking out from behind it) on one side, an oversized
// headline/price/CTA stack on the other, and a dark footer bar with the
// shop name and a QR code. Entirely driven by the shop's own theme colors
// rather than the reference's fixed gold/cream palette.
async function renderBoldProductFlyer(input: RenderProductFlyerInput): Promise<HTMLCanvasElement> {
  const { tenant, product } = input;
  const tokens = tenant.themeTokens;
  const bg = tokens?.background || "#faf7f1";
  const primary = tokens?.primary || "#111111";
  const accent = tokens?.accent || tokens?.primary || "#b8902f";
  const fg = tokens?.foreground || "#111111";
  const url = getCanonicalUrl(tenant, `/products/${product.slug}`);

  const FLYER_H = 1090;
  const canvas = document.createElement("canvas");
  canvas.width = FLYER_W * PIXEL_RATIO;
  canvas.height = FLYER_H * PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, FLYER_W, FLYER_H);

  // --- Header: brand mark + name/subtitle (left), category tag (right) ---
  const headerTop = 50;
  const markSize = 84;
  roundedRectPath(ctx, MARGIN, headerTop, markSize, markSize, 18);
  ctx.fillStyle = primary;
  ctx.fill();

  let logoDrawn = false;
  if (tenant.logoUrl) {
    try {
      const logo = await loadImage(logoProxyUrl(tenant));
      ctx.save();
      const pad = 8;
      roundedRectPath(ctx, MARGIN + pad, headerTop + pad, markSize - pad * 2, markSize - pad * 2, 12);
      ctx.clip();
      drawImageCover(ctx, logo, MARGIN + pad, headerTop + pad, markSize - pad * 2, markSize - pad * 2);
      ctx.restore();
      logoDrawn = true;
    } catch {
      // Falls through to the monogram below.
    }
  }
  if (!logoDrawn) {
    ctx.textAlign = "center";
    ctx.fillStyle = accent;
    ctx.font = `700 34px Georgia, 'Times New Roman', serif`;
    ctx.fillText(
      tenant.name.charAt(0).toUpperCase(),
      MARGIN + markSize / 2,
      headerTop + markSize / 2 + 12,
    );
  }

  const textX = MARGIN + markSize + 20;
  ctx.textAlign = "left";
  ctx.fillStyle = fg;
  ctx.font = `800 30px ${FONT_STACK}`;
  ctx.fillText(truncateToWidth(ctx, tenant.name, 300), textX, headerTop + markSize / 2 - 6);
  if (tenant.footerTagline) {
    ctx.globalAlpha = 0.65;
    ctx.font = `500 15px ${FONT_STACK}`;
    ctx.fillText(
      truncateToWidth(ctx, tenant.footerTagline, 300),
      textX,
      headerTop + markSize / 2 + 18,
    );
    ctx.globalAlpha = 1;
  }

  const categoryText = (product.category || tenant.name).toUpperCase();
  const categoryY = headerTop + 14;
  ctx.font = `700 14px ${FONT_STACK}`;
  ctx.fillStyle = fg;
  fillTextSpaced(ctx, truncateToWidth(ctx, categoryText, 260), FLYER_W - MARGIN, categoryY, 3, "right");
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(FLYER_W - MARGIN - 58, categoryY + 14);
  ctx.lineTo(FLYER_W - MARGIN, categoryY + 14);
  ctx.stroke();

  // --- Photo card: soft accent circles peeking from behind, rounded photo on top ---
  const layoutTop = headerTop + markSize + 40;
  const contentW = FLYER_W - MARGIN * 2;
  const gap = 40;
  const photoW = Math.round((contentW - gap) / 1.56);
  const photoH = Math.round(photoW * 1.25);
  const photoX = MARGIN;
  const photoY = layoutTop;
  const copyX = MARGIN + photoW + gap;
  const copyW = FLYER_W - MARGIN - copyX;

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(photoX, photoY + photoH * 0.35, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(photoX + photoW, photoY + photoH, 75, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  roundedRectPath(ctx, photoX, photoY, photoW, photoH, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, photoX, photoY, photoW, photoH, 24);
  ctx.clip();
  if (product.image) {
    try {
      const img = await loadImage(mediaProxyUrl(product.image));
      drawImageCover(ctx, img, photoX, photoY, photoW, photoH);
    } catch {
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(photoX, photoY, photoW, photoH);
    }
  } else {
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(photoX, photoY, photoW, photoH);
  }
  ctx.restore();

  // Small rotated badge accent, top-left corner of the photo.
  ctx.save();
  ctx.translate(photoX + 50, photoY + 50);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.stroke();
  drawHeartOutline(ctx, 0, -6, 18, "rgba(255,255,255,0.9)", true);
  ctx.restore();

  // --- Copy column: eyebrow (sale only), headline, tagline, price, CTA, details ---
  let cursorY = photoY + 20;
  ctx.textAlign = "left";

  if (isOnSale(product)) {
    const pillLabel = "ON SALE";
    ctx.font = `800 13px ${FONT_STACK}`;
    const pillW = ctx.measureText(pillLabel).width + 32;
    const pillH = 32;
    roundedRectPath(ctx, copyX, cursorY, pillW, pillH, pillH / 2);
    ctx.fillStyle = primary;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(pillLabel, copyX + 16, cursorY + pillH / 2 + 4);
    cursorY += pillH + 22;
  }

  ctx.fillStyle = fg;
  ctx.font = `800 44px ${FONT_STACK}`;
  for (const line of wrapToLines(ctx, product.title, copyW, 2)) {
    cursorY += 42;
    ctx.fillText(line, copyX, cursorY);
  }
  cursorY += 28;

  const tagline =
    input.tagline?.trim() ||
    product.description.split(/(?<=[.!?])\s/)[0]?.trim() ||
    `From ${tenant.name}.`;
  ctx.font = `italic 600 22px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = accent;
  for (const line of wrapToLines(ctx, tagline, copyW, 2)) {
    cursorY += 27;
    ctx.fillText(line, copyX, cursorY);
  }
  cursorY += 32;

  const availabilityText = product.preorder
    ? "Made to order"
    : !product.trackStock
      ? "Available now"
      : product.stock > 0
        ? `${product.stock} in stock`
        : "Out of stock";

  ctx.fillStyle = fg;
  if (isOnSale(product)) {
    ctx.font = `600 20px ${FONT_STACK}`;
    ctx.globalAlpha = 0.55;
    drawStrikethrough(ctx, formatMoney(product.price), copyX, cursorY);
    ctx.globalAlpha = 1;
    cursorY += 44;
    ctx.font = `900 44px ${FONT_STACK}`;
    ctx.fillText(formatMoney(discountedPrice(product)), copyX, cursorY);
  } else {
    ctx.font = `900 44px ${FONT_STACK}`;
    ctx.fillText(formatMoney(product.price), copyX, cursorY);
  }
  ctx.font = `700 12px ${FONT_STACK}`;
  ctx.globalAlpha = 0.6;
  fillTextSpaced(ctx, availabilityText.toUpperCase(), copyX, cursorY + 22, 2, "left");
  ctx.globalAlpha = 1;
  cursorY += 54;

  const ctaW = Math.min(220, copyW);
  const ctaH = 54;
  roundedRectPath(ctx, copyX, cursorY, ctaW, ctaH, ctaH / 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = primary;
  ctx.font = `800 17px ${FONT_STACK}`;
  ctx.fillText("SHOP NOW  →", copyX + ctaW / 2, cursorY + ctaH / 2 + 6);
  ctx.textAlign = "left";
  cursorY += ctaH + 28;

  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(copyX, cursorY);
  ctx.lineTo(copyX + copyW, cursorY);
  ctx.stroke();
  ctx.globalAlpha = 1;
  cursorY += 26;

  const details = [product.sku ? `SKU ${product.sku}` : null, `Confirmed by ${tenant.name} before you pay`]
    .filter((line): line is string => Boolean(line));
  ctx.font = `700 14px ${FONT_STACK}`;
  for (const line of details) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(copyX + 5, cursorY - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(truncateToWidth(ctx, line, copyW - 22), copyX + 20, cursorY);
    cursorY += 26;
  }

  // --- Footer: dark bar with shop name/URL (left) and QR code (right) ---
  const footerH = 108;
  const footerTop = FLYER_H - footerH;
  ctx.fillStyle = primary;
  ctx.fillRect(0, footerTop, FLYER_W, footerH);
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 24px ${FONT_STACK}`;
  ctx.fillText(truncateToWidth(ctx, tenant.name, 500), MARGIN, footerTop + 46);
  ctx.globalAlpha = 0.7;
  ctx.font = `500 14px ${FONT_STACK}`;
  ctx.fillText(prettyUrl(getCanonicalUrl(tenant)), MARGIN, footerTop + 72);
  ctx.globalAlpha = 1;

  const qrSize = 78;
  const qrX = FLYER_W - MARGIN - qrSize;
  const qrY = footerTop + (footerH - qrSize) / 2;
  const qrCanvas = await drawQr(url, qrSize);
  ctx.fillStyle = "#ffffff";
  roundedRectPath(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 10);
  ctx.fill();
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  return canvas;
}
*/

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

export async function getProductFlyerPngBlob(input: RenderProductFlyerInput): Promise<Blob> {
  const canvas = await renderProductFlyer(input);
  return canvasToBlob(canvas);
}

export async function downloadProductFlyerPng(input: RenderProductFlyerInput): Promise<void> {
  const blob = await getProductFlyerPngBlob(input);
  triggerBlobDownload(blob, `${input.tenant.slug}-${input.product.slug}-flyer.png`);
}

export async function downloadProductFlyerPdf(input: RenderProductFlyerInput): Promise<void> {
  const canvas = await renderProductFlyer(input);
  const dataUrl = canvas.toDataURL("image/png");
  // See generate-collection-flyer.ts's downloadCollectionFlyerPdf comment —
  // jsPDF's unit: "px" has a scale mismatch between the page format and
  // addImage's coordinates, and silently swaps a landscape [w, h] format to
  // fit its portrait default unless orientation is passed explicitly.
  const DPI = 96;
  const widthIn = canvas.width / DPI;
  const heightIn = canvas.height / DPI;
  const orientation = widthIn >= heightIn ? "landscape" : "portrait";
  const doc = new jsPDF({ unit: "in", format: [widthIn, heightIn], orientation });
  doc.addImage(dataUrl, "PNG", 0, 0, widthIn, heightIn);
  doc.save(`${input.tenant.slug}-${input.product.slug}-flyer.pdf`);
}
