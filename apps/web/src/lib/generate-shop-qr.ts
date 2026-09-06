import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { getCanonicalUrl } from "./canonical";
import type { Tenant } from "./types";

// A square "branded QR card": shop name, a QR code (high error-correction
// so a center logo badge doesn't break scanning), the shop's own URL as
// plain text, and small "Powered by Selltns" credit — the same composed
// image is reused for the PNG download, the print PDF, and the share
// sheet, so all three always look identical.
const CARD_SIZE = 1000;
const QR_SIZE = 620;
const QR_Y = 210;
const FONT_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Needed to read the logo's pixels back out via canvas export — if the
    // host doesn't send CORS headers for it, this makes the load fail
    // cleanly (onerror) instead of silently tainting the canvas later.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
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

// Draws `img` into the x/y/w/h box, cropping (not squashing) to fill it —
// same idea as CSS `object-fit: cover`.
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

export async function renderShopQrCard(tenant: Tenant): Promise<HTMLCanvasElement> {
  const url = getCanonicalUrl(tenant);
  const canvas = document.createElement("canvas");
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  const accent = tenant.themeTokens?.primary || "#1a1a1a";
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, CARD_SIZE, 14);

  ctx.textAlign = "center";
  ctx.fillStyle = "#111111";
  ctx.font = `700 44px ${FONT_STACK}`;
  ctx.fillText(tenant.name, CARD_SIZE / 2, 112, CARD_SIZE - 120);

  ctx.fillStyle = "#6b7280";
  ctx.font = `500 26px ${FONT_STACK}`;
  ctx.fillText("Scan to shop", CARD_SIZE / 2, 156);

  // QR code, rendered onto its own offscreen canvas then composited in —
  // 'H' error correction tolerates the center logo badge covering part of it.
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, url, {
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#111111ff", light: "#ffffffff" },
  });
  const qrX = (CARD_SIZE - QR_SIZE) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.10)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "#ffffff";
  roundedRectPath(ctx, qrX - 24, QR_Y - 24, QR_SIZE + 48, QR_SIZE + 48, 20);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(qrCanvas, qrX, QR_Y, QR_SIZE, QR_SIZE);

  if (tenant.logoUrl) {
    try {
      const logo = await loadImage(tenant.logoUrl);
      const badgeSize = QR_SIZE * 0.2;
      const badgeX = CARD_SIZE / 2 - badgeSize / 2;
      const badgeY = QR_Y + QR_SIZE / 2 - badgeSize / 2;
      ctx.save();
      roundedRectPath(ctx, badgeX - 12, badgeY - 12, badgeSize + 24, badgeSize + 24, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      roundedRectPath(ctx, badgeX, badgeY, badgeSize, badgeSize, 12);
      ctx.clip();
      drawImageCover(ctx, logo, badgeX, badgeY, badgeSize, badgeSize);
      ctx.restore();
    } catch {
      // Logo couldn't be loaded (CORS, network, etc.) — ship the QR without
      // the center badge rather than failing the whole card.
    }
  }

  ctx.fillStyle = "#4b5563";
  ctx.font = `500 24px ${FONT_STACK}`;
  ctx.fillText(prettyUrl(url), CARD_SIZE / 2, QR_Y + QR_SIZE + 62, CARD_SIZE - 120);

  ctx.fillStyle = "#9ca3af";
  ctx.font = `600 20px ${FONT_STACK}`;
  ctx.fillText("Powered by Selltns", CARD_SIZE / 2, CARD_SIZE - 48);

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the QR code image."));
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

export async function getShopQrPngBlob(tenant: Tenant): Promise<Blob> {
  const canvas = await renderShopQrCard(tenant);
  return canvasToBlob(canvas);
}

export async function downloadShopQrPng(tenant: Tenant): Promise<void> {
  const blob = await getShopQrPngBlob(tenant);
  triggerBlobDownload(blob, `${tenant.slug}-qr-code.png`);
}

// A compact, print-ready page (roughly 4x4in) — sized for a product-package
// sticker or a small counter card, not a full A4 sheet.
export async function downloadShopQrPdf(tenant: Tenant): Promise<void> {
  const canvas = await renderShopQrCard(tenant);
  const dataUrl = canvas.toDataURL("image/png");
  const pagePt = 320;
  const doc = new jsPDF({ unit: "pt", format: [pagePt, pagePt] });
  const margin = 20;
  const imageSize = pagePt - margin * 2;
  doc.addImage(dataUrl, "PNG", margin, margin, imageSize, imageSize);
  doc.save(`${tenant.slug}-qr-code.pdf`);
}
