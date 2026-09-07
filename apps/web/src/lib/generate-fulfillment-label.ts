import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { getCanonicalUrl } from "./canonical";
import type { Tenant } from "./types";

// Printable order-fulfillment labels: meant to be printed and stuck onto a
// packed product, not viewed on screen. Two fixed templates ("classic" and
// "modern") — a vendor picks one, we render it onto a canvas sized for a
// real-world 4x6in portrait shipping label (at 200dpi), then export it the
// same way the shop QR card does: PNG, print-ready PDF, or the OS share sheet.
export type LabelTemplate = "classic" | "modern";

const LABEL_W = 800; // 4in @ 200dpi
const LABEL_H = 1200; // 6in @ 200dpi
const MARGIN = 56;
const BODY_TOP = 300;
const FONT_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
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

// Same-origin proxy — see the comment in generate-shop-qr.ts. The R2 public
// domain tenant logos live on sends no CORS headers, so loading tenant.logoUrl
// directly with crossOrigin="anonymous" fails silently and the logo never
// draws. This route already exists for the tenant favicon, which has the
// same same-origin requirement.
function logoProxyUrl(tenant: Tenant): string {
  return `/api/favicon?slug=${encodeURIComponent(tenant.slug)}`;
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

// One handwrite row: a small caps label above a dashed rule the vendor
// writes on. Returns the y just below the drawn row so callers can stack
// rows without hard-coding offsets.
function drawWriteLine(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  width: number,
  labelColor: string,
  ruleColor: string,
): number {
  ctx.textAlign = "left";
  ctx.fillStyle = labelColor;
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(label.toUpperCase(), x, y);

  const ruleY = y + 34;
  ctx.save();
  ctx.strokeStyle = ruleColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 8]);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, ruleY);
  ctx.lineTo(x + width, ruleY);
  ctx.stroke();
  ctx.restore();

  return ruleY + 40;
}

async function drawQr(url: string, size: number): Promise<HTMLCanvasElement> {
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, url, {
    width: size,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#111111ff", light: "#ffffffff" },
  });
  return qrCanvas;
}

// Shared single-column write-in area used by both templates: recipient,
// phone, delivery location, landmark, an order no./date pair, then a notes
// box filling the rest of the label. Identical geometry in both templates
// keeps this the single place row spacing can go wrong, instead of two
// copies drifting apart.
function drawBody(
  ctx: CanvasRenderingContext2D,
  top: number,
  labelColor: string,
  ruleColor: string,
) {
  const fieldWidth = LABEL_W - MARGIN * 2;

  let y = top;
  y = drawWriteLine(ctx, "Recipient name", MARGIN, y, fieldWidth, labelColor, ruleColor);
  y = drawWriteLine(ctx, "Phone number", MARGIN, y, fieldWidth, labelColor, ruleColor);
  y = drawWriteLine(ctx, "Delivery location", MARGIN, y, fieldWidth, labelColor, ruleColor);
  y = drawWriteLine(ctx, "Landmark / directions", MARGIN, y, fieldWidth, labelColor, ruleColor);

  const halfWidth = (fieldWidth - 24) / 2;
  drawWriteLine(ctx, "Order no.", MARGIN, y, halfWidth, labelColor, ruleColor);
  y = drawWriteLine(ctx, "Date", MARGIN + halfWidth + 24, y, halfWidth, labelColor, ruleColor);

  y += 10;
  ctx.textAlign = "left";
  ctx.fillStyle = labelColor;
  ctx.font = `700 18px ${FONT_STACK}`;
  ctx.fillText("NOTES", MARGIN, y);
  y += 14;

  const notesBottom = LABEL_H - MARGIN - 70;
  ctx.strokeStyle = ruleColor;
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, MARGIN, y, fieldWidth, notesBottom - y, 10);
  ctx.stroke();
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#9ca3af";
  ctx.font = `600 18px ${FONT_STACK}`;
  ctx.fillText("Powered by selltns.com", LABEL_W / 2, LABEL_H - 26);
}

async function renderClassicLabel(tenant: Tenant): Promise<HTMLCanvasElement> {
  const url = getCanonicalUrl(tenant);
  const accent = tenant.themeTokens?.primary || "#1a1a1a";
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_W;
  canvas.height = LABEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, LABEL_W, 10);

  const headerTop = 30;
  const logoSize = 96;
  let textX = MARGIN;

  if (tenant.logoUrl) {
    try {
      const logo = await loadImage(logoProxyUrl(tenant));
      ctx.save();
      roundedRectPath(ctx, MARGIN, headerTop, logoSize, logoSize, 14);
      ctx.clip();
      drawImageCover(ctx, logo, MARGIN, headerTop, logoSize, logoSize);
      ctx.restore();
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1.5;
      roundedRectPath(ctx, MARGIN, headerTop, logoSize, logoSize, 14);
      ctx.stroke();
      textX = MARGIN + logoSize + 24;
    } catch {
      // No logo badge if it can't load — fall through with plain text header.
    }
  }

  const qrSize = 140;
  const qrX = LABEL_W - MARGIN - qrSize;
  const nameWidth = qrX - 20 - textX;

  ctx.textAlign = "left";
  ctx.fillStyle = "#111111";
  ctx.font = `800 32px ${FONT_STACK}`;
  ctx.fillText(tenant.name, textX, headerTop + 32, nameWidth);
  if (tenant.whatsappNumber) {
    ctx.fillStyle = "#6b7280";
    ctx.font = `500 19px ${FONT_STACK}`;
    ctx.fillText(tenant.whatsappNumber, textX, headerTop + 62, nameWidth);
  }

  const qrCanvas = await drawQr(url, qrSize);
  ctx.save();
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, qrX - 10, headerTop - 10, qrSize + 20, qrSize + 20, 12);
  ctx.stroke();
  ctx.restore();
  ctx.drawImage(qrCanvas, qrX, headerTop, qrSize, qrSize);
  ctx.textAlign = "center";
  ctx.fillStyle = "#9ca3af";
  ctx.font = `600 14px ${FONT_STACK}`;
  ctx.fillText("SCAN TO SHOP", qrX + qrSize / 2, headerTop + qrSize + 24);
  ctx.fillStyle = "#4b5563";
  ctx.font = `600 15px ${FONT_STACK}`;
  ctx.fillText(prettyUrl(url), qrX + qrSize / 2, headerTop + qrSize + 46, qrSize + 30);

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, 255);
  ctx.lineTo(LABEL_W - MARGIN, 255);
  ctx.stroke();

  drawBody(ctx, BODY_TOP, "#6b7280", "#9ca3af");
  drawFooter(ctx);

  return canvas;
}

async function renderModernLabel(tenant: Tenant): Promise<HTMLCanvasElement> {
  const url = getCanonicalUrl(tenant);
  const accent = tenant.themeTokens?.primary || "#1a1a1a";
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_W;
  canvas.height = LABEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);

  const bandH = 210;
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, LABEL_W, bandH);

  const logoSize = 92;
  const logoY = (bandH - logoSize) / 2;
  let textX = MARGIN;

  if (tenant.logoUrl) {
    try {
      const logo = await loadImage(logoProxyUrl(tenant));
      ctx.save();
      roundedRectPath(ctx, MARGIN, logoY, logoSize, logoSize, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      roundedRectPath(ctx, MARGIN + 8, logoY + 8, logoSize - 16, logoSize - 16, 12);
      ctx.clip();
      drawImageCover(ctx, logo, MARGIN + 8, logoY + 8, logoSize - 16, logoSize - 16);
      ctx.restore();
      textX = MARGIN + logoSize + 24;
    } catch {
      // No logo badge if it can't load.
    }
  }

  const qrSize = 110;
  const qrPad = 10;
  const qrOuter = qrSize + qrPad * 2;
  const qrX = LABEL_W - MARGIN - qrOuter;
  const qrY = (bandH - qrOuter) / 2;
  const nameWidth = qrX - 20 - textX;

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 30px ${FONT_STACK}`;
  ctx.fillText(tenant.name, textX, 76, nameWidth);
  ctx.font = `500 17px ${FONT_STACK}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText("Order fulfillment label", textX, 102, nameWidth);
  if (tenant.whatsappNumber) {
    ctx.fillText(tenant.whatsappNumber, textX, 128, nameWidth);
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#ffffff";
  roundedRectPath(ctx, qrX, qrY, qrOuter, qrOuter, 14);
  ctx.fill();
  ctx.restore();
  const qrCanvas = await drawQr(url, qrSize);
  ctx.drawImage(qrCanvas, qrX + qrPad, qrY + qrPad, qrSize, qrSize);

  ctx.textAlign = "right";
  ctx.fillStyle = "#9ca3af";
  ctx.font = `600 14px ${FONT_STACK}`;
  ctx.fillText("SCAN TO SHOP", LABEL_W - MARGIN, bandH + 26);
  ctx.fillStyle = accent;
  ctx.font = `700 15px ${FONT_STACK}`;
  ctx.fillText(prettyUrl(url), LABEL_W - MARGIN, bandH + 48);

  drawBody(ctx, BODY_TOP, accent, "#d1d5db");
  drawFooter(ctx);

  return canvas;
}

export async function renderFulfillmentLabel(
  tenant: Tenant,
  template: LabelTemplate,
): Promise<HTMLCanvasElement> {
  return template === "modern" ? renderModernLabel(tenant) : renderClassicLabel(tenant);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the label image."));
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

export async function getFulfillmentLabelPngBlob(
  tenant: Tenant,
  template: LabelTemplate,
): Promise<Blob> {
  const canvas = await renderFulfillmentLabel(tenant, template);
  return canvasToBlob(canvas);
}

export async function downloadFulfillmentLabelPng(
  tenant: Tenant,
  template: LabelTemplate,
): Promise<void> {
  const blob = await getFulfillmentLabelPngBlob(tenant, template);
  triggerBlobDownload(blob, `${tenant.slug}-fulfillment-label-${template}.png`);
}

// A single 4x6in portrait label page — the size most sticker/label printers
// (and print shops) expect for a shipping-style label, not a full A4 sheet.
export async function downloadFulfillmentLabelPdf(
  tenant: Tenant,
  template: LabelTemplate,
): Promise<void> {
  const canvas = await renderFulfillmentLabel(tenant, template);
  const dataUrl = canvas.toDataURL("image/png");
  const doc = new jsPDF({ unit: "in", format: [4, 6] });
  doc.addImage(dataUrl, "PNG", 0, 0, 4, 6);
  doc.save(`${tenant.slug}-fulfillment-label-${template}.pdf`);
}
