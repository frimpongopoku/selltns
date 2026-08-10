import { brandPage, logoMark } from '../common/brand-page';
import type { CheckStatus, HealthCheckResult } from './health.service';

const STATUS_COPY: Record<CheckStatus, string> = {
  ok: 'All systems operational',
  warn: 'Operational, with dev fallbacks active',
  error: 'Something needs attention',
};

function statusDot(status: CheckStatus): string {
  return `<span class="dot dot-${status}"></span>`;
}

function checkRow(result: HealthCheckResult): string {
  return `
    <div class="row">
      <div class="row-main">
        ${statusDot(result.status)}
        <span class="row-name">${result.name}</span>
      </div>
      <span class="row-detail muted">${result.detail}</span>
      <span class="row-ms muted">${result.ms}ms</span>
    </div>`;
}

export function renderHealthPage(opts: {
  status: CheckStatus;
  results: HealthCheckResult[];
  totalMs: number;
}): string {
  const { status, results, totalMs } = opts;
  const checkedAt = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date());

  return brandPage({
    title: `${status === 'ok' ? '✅' : status === 'warn' ? '⚠️' : '🔴'} Selltns status`,
    bodyHtml: `
      <style>
        .status-card { padding: 36px 32px; width: 100%; max-width: 560px; }
        .status-head { display: flex; align-items: center; gap: 14px; margin-bottom: 4px; }
        .status-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
        }
        .status-ok { background: var(--ok-bg); color: var(--ok); }
        .status-warn { background: var(--warn-bg); color: var(--warn); }
        .status-error { background: var(--error-bg); color: var(--error); }
        .dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; flex-shrink: 0; }
        .dot-ok { background: var(--ok); }
        .dot-warn { background: var(--warn); }
        .dot-error { background: var(--error); }
        .row {
          display: grid; grid-template-columns: 1fr auto auto;
          gap: 6px 16px; align-items: center;
          padding: 14px 0; border-top: 1px solid var(--border);
        }
        .row-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .row-name { font-size: 14px; font-weight: 500; }
        .row-detail { font-size: 13px; text-align: right; }
        .row-ms { font-size: 12px; font-variant-numeric: tabular-nums; min-width: 44px; text-align: right; }
        .meta-line { display: flex; justify-content: space-between; margin-top: 20px; font-size: 12px; }
        @media (max-width: 480px) {
          .row { grid-template-columns: 1fr; row-gap: 4px; }
          .row-detail, .row-ms { text-align: left; }
        }
      </style>
      <div class="card status-card">
        <div class="status-head">
          ${logoMark(28)}
          <h1 class="heading" style="font-size: 19px;">System status</h1>
        </div>
        <div style="margin-top: 16px;">
          <span class="status-pill status-${status}">${statusDot(status)} ${STATUS_COPY[status]}</span>
        </div>

        <div style="margin-top: 8px;">
          ${results.map(checkRow).join('')}
        </div>

        <div class="meta-line muted">
          <span>Checked in ${totalMs}ms</span>
          <span>${checkedAt}</span>
        </div>
      </div>
      <p class="muted" style="font-size: 12px; margin-top: 16px;">
        <a href="/health" style="text-decoration: underline dotted; text-underline-offset: 2px;">Refresh</a>
        · also available as JSON via <code>Accept: application/json</code>
      </p>
    `,
  });
}
