import type { Order, Role, Tenant } from '../common/types';

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

function preorderBanner(order: Order): string {
  if (order.type !== 'PREORDER') return '';
  return `
    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; margin: 0 0 20px;">
      <p style="font-size: 13px; font-weight: 600; color: #9a3412; margin: 0;">This is a pre-order</p>
      <p style="font-size: 13px; color: #9a3412; margin: 4px 0 0;">Made after ordering, not shipped from stock.</p>
    </div>`;
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
  const depositNote =
    order.type === 'PREORDER' && order.depositAmount != null
      ? `<p style="font-size: 13px; color: #9a3412; margin: 0 0 20px;">
          Once ${tenant.name} confirms, you'll be asked for a deposit of
          ${formatGHS(order.depositAmount)}${order.depositType === 'PERCENTAGE' ? ` (${order.depositPercentage}%)` : ''} —
          the rest is due once your order is ready.
        </p>`
      : '';
  const html = layout(
    tenant.name,
    `
    ${preorderBanner(order)}
    <h1 style="font-size: 20px; margin: 0 0 8px;">Thanks, ${order.customerName.split(' ')[0]}!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      Your order request has been sent to ${tenant.name}. No payment is needed yet —
      they'll review it and confirm shortly.
    </p>
    ${depositNote}
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
  const subject =
    order.type === 'PREORDER'
      ? `New pre-order from ${order.customerName} — ${formatGHS(order.total)}`
      : `New order request from ${order.customerName} — ${formatGHS(order.total)}`;
  const contactLines = [
    order.customerContact,
    order.customerEmail,
    order.whatsappNumber ? `WhatsApp: ${order.whatsappNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const deliveryLine = order.deliveryAddress
    ? `<p style="font-size: 13px; color: #666; margin: 4px 0 0;">Delivery address: ${order.deliveryAddress}</p>`
    : '';
  const html = layout(
    tenant.name,
    `
    ${preorderBanner(order)}
    <h1 style="font-size: 20px; margin: 0 0 8px;">${order.type === 'PREORDER' ? 'New pre-order request' : 'New order request'}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 4px;">
      ${order.customerName} (${contactLines}) just requested an order.
    </p>
    ${deliveryLine}
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      ${itemsList(order)}
      <tr>
        <td style="padding: 12px 0 0; font-weight: 600; border-top: 1px solid #eee;">Total</td>
        <td style="padding: 12px 0 0; font-weight: 600; text-align: right; border-top: 1px solid #eee;">${formatGHS(order.total)}</td>
      </tr>
      ${
        order.type === 'PREORDER' && order.depositAmount != null
          ? `<tr>
              <td style="padding: 4px 0 0; font-size: 13px; color: #9a3412;">Deposit due on confirm</td>
              <td style="padding: 4px 0 0; font-size: 13px; color: #9a3412; text-align: right;">${formatGHS(order.depositAmount)}</td>
            </tr>`
          : ''
      }
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
  const isPreorder = order.type === 'PREORDER' && order.depositAmount != null;
  const amountDueNow = isPreorder ? order.depositAmount! : order.total;
  const subject = isPreorder
    ? `Your pre-order is confirmed — pay your deposit to ${tenant.name}`
    : `Your order is confirmed — pay ${tenant.name}`;
  const preorderRows = isPreorder
    ? `<tr>
        <td style="padding: 12px 0 0; font-weight: 600; border-top: 1px solid #eee;">Deposit due now${order.depositType === 'PERCENTAGE' ? ` (${order.depositPercentage}%)` : ''}</td>
        <td style="padding: 12px 0 0; font-weight: 600; text-align: right; border-top: 1px solid #eee;">${formatGHS(amountDueNow)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0 0; font-size: 13px; color: #888;">Balance due later</td>
        <td style="padding: 4px 0 0; font-size: 13px; color: #888; text-align: right;">${formatGHS(order.balanceAmount ?? 0)}</td>
      </tr>`
    : `<tr>
        <td style="padding: 12px 0 0; font-weight: 600; border-top: 1px solid #eee;">Total to pay</td>
        <td style="padding: 12px 0 0; font-weight: 600; text-align: right; border-top: 1px solid #eee;">${formatGHS(order.total)}</td>
      </tr>`;
  const html = layout(
    tenant.name,
    `
    ${preorderBanner(order)}
    <h1 style="font-size: 20px; margin: 0 0 8px;">Good news — your order's confirmed!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      ${tenant.name} has confirmed your order. You can pay ${isPreorder ? 'your deposit' : 'now'} using any of their
      payment options — just include your reference below.${isPreorder ? ` ${tenant.name} will reach out for the remaining balance once your order is ready.` : ''}
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
      ${itemsList(order)}
      ${preorderRows}
    </table>
    ${button(payUrl, isPreorder ? 'Pay deposit now' : 'Pay now')}
    <p style="font-size: 12px; color: #888; margin-top: 20px;">
      Prefer to check the full order first? <a href="${trackUrl}" style="color: #1a1a1a;">View your order</a>.
    </p>`,
  );
  const text = isPreorder
    ? `Your pre-order from ${tenant.name} is confirmed. Pay your deposit of ${formatGHS(amountDueNow)} using reference ${order.paymentReference}: ${payUrl}`
    : `Your order from ${tenant.name} is confirmed. Pay ${formatGHS(order.total)} using reference ${order.paymentReference}: ${payUrl}`;
  return { subject, html, text };
}

export function orderCompletedCustomerEmail(
  order: Order,
  tenant: Tenant,
  trackUrl: string,
) {
  const subject = `Your order from ${tenant.name} is complete`;
  const html = layout(
    tenant.name,
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">All done — thanks for shopping with ${tenant.name}!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      Your order has been marked complete. We hope you love what you got.
    </p>
    <table style="width: 100%; border-collapse: collapse;">
      ${itemsList(order)}
      <tr>
        <td style="padding: 12px 0 0; font-weight: 600; border-top: 1px solid #eee;">Total</td>
        <td style="padding: 12px 0 0; font-weight: 600; text-align: right; border-top: 1px solid #eee;">${formatGHS(order.total)}</td>
      </tr>
    </table>
    ${button(trackUrl, 'View your order')}`,
  );
  const text = `Your order from ${tenant.name} (${formatGHS(order.total)}) is complete. View it: ${trackUrl}`;
  return { subject, html, text };
}

export function orderCancelledCustomerEmail(
  order: Order,
  tenant: Tenant,
  trackUrl: string,
) {
  const subject = `Your order from ${tenant.name} was cancelled`;
  const html = layout(
    tenant.name,
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">Your order has been cancelled</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      This order from ${tenant.name} has been cancelled. No payment is needed.
      If this wasn't expected, reach out to ${tenant.name} directly.
    </p>
    <table style="width: 100%; border-collapse: collapse;">
      ${itemsList(order)}
      <tr>
        <td style="padding: 12px 0 0; font-weight: 600; border-top: 1px solid #eee;">Total</td>
        <td style="padding: 12px 0 0; font-weight: 600; text-align: right; border-top: 1px solid #eee;">${formatGHS(order.total)}</td>
      </tr>
    </table>
    ${button(trackUrl, 'View your order')}`,
  );
  const text = `Your order from ${tenant.name} (${formatGHS(order.total)}) was cancelled. View it: ${trackUrl}`;
  return { subject, html, text };
}

export function preorderUpdateEmail(
  order: Order,
  tenant: Tenant,
  trackUrl: string,
  note: string,
) {
  const subject = `Update on your pre-order from ${tenant.name}`;
  const html = layout(
    tenant.name,
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">New update on your pre-order</h1>
    <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
      <p style="font-size: 14px; line-height: 1.6; color: #1a1a1a; margin: 0;">${note}</p>
    </div>
    <p style="font-size: 13px; color: #888; margin: 0 0 20px;">
      Reference ${order.paymentReference}
    </p>
    ${button(trackUrl, 'View your order')}`,
  );
  const text = `Update on your pre-order from ${tenant.name}: ${note}. View it: ${trackUrl}`;
  return { subject, html, text };
}

export function preorderBalanceDueEmail(
  order: Order,
  tenant: Tenant,
  trackUrl: string,
  payUrl: string,
) {
  const balance = order.balanceAmount ?? 0;
  const subject = `Your pre-order is ready — pay the balance to ${tenant.name}`;
  const html = layout(
    tenant.name,
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">Your pre-order is ready!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      ${tenant.name} says your order is ready. Pay the remaining balance below to complete it.
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
        <td style="padding: 8px 0; font-weight: 600;">Balance due</td>
        <td style="padding: 8px 0; font-weight: 600; text-align: right;">${formatGHS(balance)}</td>
      </tr>
    </table>
    ${button(payUrl, 'Pay balance now')}
    <p style="font-size: 12px; color: #888; margin-top: 20px;">
      Prefer to check the full order first? <a href="${trackUrl}" style="color: #1a1a1a;">View your order</a>.
    </p>`,
  );
  const text = `Your pre-order from ${tenant.name} is ready. Pay the balance of ${formatGHS(balance)} using reference ${order.paymentReference}: ${payUrl}`;
  return { subject, html, text };
}

export function teamInviteEmail(
  member: { name: string; email: string; role: Role },
  tenant: Tenant,
  loginUrl: string,
) {
  const roleLabel = member.role.charAt(0) + member.role.slice(1).toLowerCase();
  const subject = `You've been invited to ${tenant.name} on Selltns`;
  const html = layout(
    tenant.name,
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">You're invited to ${tenant.name}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 16px;">
      You've been added to ${tenant.name}'s Selltns dashboard as a
      <strong>${roleLabel}</strong>.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      To get in, sign in with Google using <strong>${member.email}</strong> —
      this exact email address is how your invite is recognized, so signing
      in with a different Google account won't work.
    </p>
    ${button(loginUrl, 'Sign in to the dashboard')}`,
  );
  const text = `You've been invited to ${tenant.name} on Selltns as ${roleLabel}. Sign in with Google using ${member.email} at ${loginUrl}`;
  return { subject, html, text };
}

// Verification is a property of a person, not a single shop — approving it
// (whether via a submitted application or a direct superadmin action) marks
// every shop that person owns as Verified, so this lists all of them rather
// than naming just one tenant.
export function userVerifiedEmail(tenantNames: string[]) {
  const shopsList = tenantNames.join(', ');
  const plural = tenantNames.length > 1;
  const subject = plural ? `Your Selltns stores are now Verified` : `${tenantNames[0]} is now Verified on Selltns`;
  const html = layout(
    'Selltns',
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">You're verified</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 16px;">
      We've confirmed your identity. The Verified badge is now live on
      ${plural ? "every store you run on Selltns" : "your storefront"}
      (${shopsList}), and the payment-page caution notice has been replaced
      with it.
    </p>`,
  );
  const text = `You're verified on Selltns. The badge is now live on: ${shopsList}`;
  return { subject, html, text };
}

export function verificationRejectedEmail(tenant: Tenant, reason: string) {
  const subject = `Your Selltns verification application needs another look`;
  const html = layout(
    tenant.name,
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">Your application wasn't approved</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 16px;">${reason}</p>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      You can fix the issue and submit again from your dashboard any time.
    </p>`,
  );
  const text = `Your Selltns verification application for ${tenant.name} wasn't approved: ${reason}. You can submit again from your dashboard.`;
  return { subject, html, text };
}

export function superAdminInviteEmail(email: string, loginUrl: string) {
  const subject = `You've been added as a Selltns superadmin`;
  const html = layout(
    'Selltns',
    `
    <h1 style="font-size: 20px; margin: 0 0 8px;">You're a superadmin</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 20px;">
      You've been added to the Selltns superadmin dashboard. Sign in with
      Google using <strong>${email}</strong> — this exact email address is
      how your access is recognized.
    </p>
    ${button(loginUrl, 'Sign in to the superadmin dashboard')}`,
  );
  const text = `You've been added as a Selltns superadmin. Sign in with Google using ${email} at ${loginUrl}`;
  return { subject, html, text };
}
