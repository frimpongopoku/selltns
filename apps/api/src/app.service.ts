import { Injectable } from '@nestjs/common';
import { brandPage, logoMark, API_VERSION } from './common/brand-page';

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'https://selltns.com';

@Injectable()
export class AppService {
  renderLandingPage(): string {
    return brandPage({
      title: 'Selltns API',
      bodyHtml: `
        <div class="card" style="padding: 48px 40px; max-width: 460px; text-align: center;">
          <div style="display: flex; justify-content: center; margin-bottom: 20px;">${logoMark(40)}</div>
          <p class="eyebrow">API · v${API_VERSION}</p>
          <h1 class="heading" style="font-size: 26px;">This is the Selltns API</h1>
          <p class="muted" style="font-size: 14px; line-height: 1.6; margin: 12px 0 28px;">
            The backend powering every storefront, the vendor dashboard, and
            the superadmin console. Nothing to see here if you're a
            shopper — you probably want the store itself.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a class="btn btn-primary" href="${WEB_ORIGIN}">Go to Selltns</a>
            <a class="btn btn-outline" href="/health">System status</a>
          </div>
        </div>
      `,
    });
  }
}
