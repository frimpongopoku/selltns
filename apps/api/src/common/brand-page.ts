// Shared HTML shell for the API's two human-facing pages (landing "/" and
// "/health") — this is a plain NestJS API with no view engine, so pages are
// hand-built template strings, same approach as email/templates.ts. Colors,
// fonts, and the logo mark are copied from apps/web (globals.css / marketing
// page / components/logo.tsx) so these read as the same product, not a
// bare API stub.
const packageJson = require('../../package.json') as { version: string };

export const API_VERSION = packageJson.version;

export function logoMark(size = 30): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#14C088" />
        <stop offset="1" stop-color="#0B7A56" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="7" fill="url(#g)" />
    <text x="16" y="22.5" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="19" fill="white" letter-spacing="-0.5">S</text>
  </svg>`;
}

export function footerCredit(): string {
  return `<p class="footer-credit">
    © ${new Date().getFullYear()} Selltns API v${API_VERSION} — built by the
    <a href="https://biibisoft.com" target="_blank" rel="noreferrer">Biibisoft Team</a>
  </p>`;
}

export function brandPage(opts: { title: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${opts.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #F8F8F6;
    --fg: #141414;
    --muted: #66605A;
    --border: rgba(20, 20, 20, 0.1);
    --card: rgba(255, 255, 255, 0.7);
    --primary: #0E9F6E;
    --primary-fg: #ffffff;
    --ok: #0E9F6E;
    --ok-bg: rgba(14, 159, 110, 0.12);
    --warn: #B45309;
    --warn-bg: rgba(217, 119, 6, 0.12);
    --error: #DC2626;
    --error-bg: rgba(220, 38, 38, 0.12);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #141414;
      --fg: #F2F1EE;
      --muted: #A8A29B;
      --border: rgba(242, 241, 238, 0.12);
      --card: rgba(28, 28, 28, 0.7);
      --primary: #34D399;
      --primary-fg: #0B1F16;
      --ok: #34D399;
      --ok-bg: rgba(52, 211, 153, 0.14);
      --warn: #FBBF24;
      --warn-bg: rgba(251, 191, 36, 0.14);
      --error: #F87171;
      --error-bg: rgba(248, 113, 113, 0.14);
    }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: 'Inter', -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    padding: 24px;
  }
  .heading { font-family: 'Manrope', sans-serif; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
  .eyebrow {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--primary);
    margin: 0 0 12px;
  }
  .muted { color: var(--muted); }
  a { color: inherit; }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    backdrop-filter: blur(6px);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 11px 22px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: transform 150ms ease, opacity 150ms ease;
  }
  .btn:active { transform: scale(0.97); }
  .btn-primary { background: var(--primary); color: var(--primary-fg); }
  .btn-outline { border: 1px solid var(--border); color: var(--fg); }
  .footer-credit {
    margin-top: 40px;
    font-size: 12px;
    color: var(--muted);
    text-align: center;
  }
  .footer-credit a { text-decoration: underline dotted; text-underline-offset: 2px; }
  main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; }
</style>
</head>
<body>
<main>${opts.bodyHtml}</main>
${footerCredit()}
</body>
</html>`;
}
