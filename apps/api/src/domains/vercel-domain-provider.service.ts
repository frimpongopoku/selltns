import { Injectable, Logger } from '@nestjs/common';
import type { DomainProvider, DomainStatus } from './domain-provider';
import { instructionsFor } from './domain-utils';

@Injectable()
export class VercelDomainProvider implements DomainProvider {
  private readonly logger = new Logger('VercelDomainProvider');
  private readonly token = process.env.VERCEL_API_TOKEN as string;
  private readonly projectId = process.env.VERCEL_PROJECT_ID as string;
  private readonly teamQuery = process.env.VERCEL_TEAM_ID
    ? `?teamId=${process.env.VERCEL_TEAM_ID}`
    : '';

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async addDomain(domain: string): Promise<DomainStatus> {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${this.projectId}/domains${this.teamQuery}`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ name: domain }),
      },
    );
    // 409 = already registered to this project, which is fine — just check status.
    if (!res.ok && res.status !== 409) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Vercel add-domain failed (${res.status}): ${body}`);
      throw new Error(
        "Couldn't register that domain — please try again in a moment.",
      );
    }
    return this.getStatus(domain);
  }

  async getStatus(domain: string): Promise<DomainStatus> {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${this.projectId}/domains/${domain}${this.teamQuery}`,
      { headers: this.headers() },
    );
    if (!res.ok) {
      return { verified: false, instructions: instructionsFor(domain) };
    }
    const data = (await res.json()) as { verified?: boolean };
    return { verified: !!data.verified, instructions: instructionsFor(domain) };
  }

  async removeDomain(domain: string): Promise<void> {
    await fetch(
      `https://api.vercel.com/v9/projects/${this.projectId}/domains/${domain}${this.teamQuery}`,
      { method: 'DELETE', headers: this.headers() },
    ).catch(() => undefined);
  }
}
