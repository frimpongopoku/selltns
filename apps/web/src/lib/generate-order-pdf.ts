import { jsPDF } from "jspdf";
import { formatMoney, formatDateTime } from "./format";
import type { Order, Tenant } from "./types";

const MARGIN = 48;
const PAGE_WIDTH = 595.28; // A4 pt

function statusLabel(status: Order["status"]) {
  switch (status) {
    case "PENDING":
      return "Pending review";
    case "CONFIRMED":
      return "Confirmed, ready for payment";
    case "MODIFIED":
      return "Modified";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
  }
}

/** Generates and downloads a one-page order/pre-order receipt as a PDF. */
export function generateOrderBookletPdf(order: Order, tenant: Tenant) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const isPreorder = order.type === "PREORDER";
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(tenant.name, MARGIN, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(110);
  doc.text(isPreorder ? "Pre-order booklet" : "Order booklet", MARGIN, y);
  doc.text(statusLabel(order.status), PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 24;

  doc.setDrawColor(220);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 24;

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Payment reference", MARGIN, y);
  doc.text("Requested", PAGE_WIDTH / 2, y);
  doc.setFont("helvetica", "normal");
  y += 14;
  doc.text(order.paymentReference, MARGIN, y);
  doc.text(formatDateTime(order.createdAt), PAGE_WIDTH / 2, y);
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.text("Customer", MARGIN, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(order.customerName, MARGIN, y);
  y += 14;
  doc.text(order.customerContact, MARGIN, y);
  y += 14;
  doc.text(order.customerEmail, MARGIN, y);
  y += 28;

  // Items table
  const colTitle = MARGIN;
  const colQty = PAGE_WIDTH - MARGIN - 160;
  const colPrice = PAGE_WIDTH - MARGIN - 90;
  const colTotal = PAGE_WIDTH - MARGIN;

  doc.setFont("helvetica", "bold");
  doc.text("Item", colTitle, y);
  doc.text("Qty", colQty, y);
  doc.text("Price", colPrice, y);
  doc.text("Total", colTotal, y, { align: "right" });
  y += 8;
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  for (const item of order.items) {
    if (y > 740) {
      doc.addPage();
      y = MARGIN;
    }
    const titleLines = doc.splitTextToSize(item.title, colQty - colTitle - 12);
    doc.text(titleLines, colTitle, y);
    doc.text(String(item.quantity), colQty, y);
    doc.text(formatMoney(item.priceAtOrder), colPrice, y);
    doc.text(formatMoney(item.priceAtOrder * item.quantity), colTotal, y, { align: "right" });
    y += 14 * titleLines.length + 6;
  }

  y += 6;
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", colPrice, y);
  doc.text(formatMoney(order.total), colTotal, y, { align: "right" });
  y += 22;

  if (isPreorder) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const depositLabel =
      order.depositType === "PERCENTAGE"
        ? `Deposit (${order.depositPercentage}%)`
        : "Deposit";
    doc.text(depositLabel, colPrice, y);
    doc.text(formatMoney(order.depositAmount ?? 0), colTotal, y, { align: "right" });
    y += 16;
    if ((order.balanceAmount ?? 0) > 0) {
      doc.text("Balance", colPrice, y);
      doc.text(
        `${formatMoney(order.balanceAmount ?? 0)}${order.balancePaid ? " (paid)" : ""}`,
        colTotal,
        y,
        { align: "right" },
      );
      y += 16;
    }
  }

  y += 16;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 20;

  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text(
    `Track this order: ${typeof window !== "undefined" ? window.location.href : ""}`,
    MARGIN,
    y,
  );
  y += 14;
  doc.text(`Generated ${formatDateTime(new Date().toISOString())} via Selltns`, MARGIN, y);

  doc.save(`${order.paymentReference}-booklet.pdf`);
}
