import type { Order, Tenant } from '../common/types';

function formatGHS(amount: number): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 0,
  }).format(amount);
}

function itemsList(order: Order): string {
  return order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; font-size: 14px;">${item.title} &times; ${item.quantity}</td>
        <td style="padding: 8px 0; font-size: 14px; text-align: right; white-space: nowrap;">${formatGHS(item.priceAtOrder * item.quantity)}</td>
      </tr>`,
    )
    .join('');
}

function button(url: string, label: string): string {
  return `
    <a href="${url}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
      ${label}
    </a>`;
}

function layout(tenantName: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin: 0; background: #f5f5f4; padding: 32px 16px;">
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px 28px; color: #1a1a1a;">
      <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #888; margin: 0 0 20px;">${tenantName}</p>
      ${bodyHtml}
      <p style="margin-top: 40px; font-size: 12px; color: #999;">Sent by ${tenantName}, powered by Selltns.</p>
    </div>
  </body>
</html>`;
}

export function orderPlacedCustomerEmail(
  order: Order,
  tenant: Tenant,
  trackUrl: string,
) {
  const subject = `Your order request to ${tenant.name} — ${formatGHS(order.total)}`;
  const html = layout(
    tenant.name,
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">Thanks, ${order.customerName.split(' ')[0]}!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      Your order request has been sent to ${tenant.name}. No payment is needed yet —
      they'll review it and confirm shortly.
    </p>
    <table style="width: 100%; border-collapse: collapse;">
      ${itemsList(order)}
      <tr>
        <td style="padding: 12px 0 0; font-weight: 600; border-top: 1px solid #eee;">Total</td>
        <td style="padding: 12px 0 0; font-weight: 600; text-align: right; border-top: 1px solid #eee;">${formatGHS(order.total)}</td>
      </tr>
    </table>
    ${button(trackUrl, 'Track your order')}
    <p style="font-size: 12px; color: #888; margin-top: 16px;">
      Save this link — it's the only way to check your order status, since you don't need an account.
    </p>`,
  );
  const text = `Your order request to ${tenant.name} (${formatGHS(order.total)}) has been received. Track it: ${trackUrl}`;
  return { subject, html, text };
}

export function newOrderVendorEmail(
  order: Order,
  tenant: Tenant,
  adminUrl: string,
) {
  const subject = `New order request from ${order.customerName} — ${formatGHS(order.total)}`;
  const html = layout(
    tenant.name,
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">New order request</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      ${order.customerName} (${order.customerContact} · ${order.customerEmail}) just requested an order.
    </p>
    <table style="width: 100%; border-collapse: collapse;">
      ${itemsList(order)}
      <tr>
        <td style="padding: 12px 0 0; font-weight: 600; border-top: 1px solid #eee;">Total</td>
        <td style="padding: 12px 0 0; font-weight: 600; text-align: right; border-top: 1px solid #eee;">${formatGHS(order.total)}</td>
      </tr>
    </table>
    ${button(adminUrl, 'Review order')}`,
  );
  const text = `New order request from ${order.customerName} (${formatGHS(order.total)}). Review: ${adminUrl}`;
  return { subject, html, text };
}

export function orderConfirmedCustomerEmail(
  order: Order,
  tenant: Tenant,
  trackUrl: string,
  payUrl: string,
) {
  const subject = `Your order is confirmed — pay ${tenant.name}`;
  const html = layout(
    tenant.name,
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">Good news — your order's confirmed!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      ${tenant.name} has confirmed your order. You can pay now using any of their
      payment options — just include your reference below.
    </p>
    <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin: 0 0 4px;">
        Payment reference
      </p>
      <p style="font-size: 20px; font-weight: 700; font-family: monospace; margin: 0;">
        ${order.paymentReference}
      </p>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: 600;">Total to pay</td>
        <td style="padding: 8px 0; font-weight: 600; text-align: right;">${formatGHS(order.total)}</td>
      </tr>
    </table>
    ${button(payUrl, 'Pay now')}
    <p style="font-size: 12px; color: #888; margin-top: 20px;">
      Prefer to check the full order first? <a href="${trackUrl}" style="color: #1a1a1a;">View your order</a>.
    </p>`,
  );
  const text = `Your order from ${tenant.name} is confirmed. Pay ${formatGHS(order.total)} using reference ${order.paymentReference}: ${payUrl}`;
  return { subject, html, text };
}
