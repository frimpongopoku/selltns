import { Injectable } from '@nestjs/common';
import { resolve4, resolveCname } from 'dns/promises';
import type { DomainProvider, DomainStatus } from './domain-provider';
import { isApexDomain, instructionsFor } from './domain-utils';

function stripTrailingDot(host: string): string {
  return host.replace(/\.$/, '');
}

/**
 * Dev/no-Vercel-token fallback: verifies a domain with a plain DNS lookup
 * instead of calling out to Vercel. Lets the whole add-domain → see
 * instructions → verify flow be exercised locally with zero external
 * dependency, mirroring ConsoleEmailService/LocalDiskStorageService.
 */
@Injectable()
export class ManualDnsDomainProvider implements DomainProvider {
  async addDomain(domain: string): Promise<DomainStatus> {
    return this.getStatus(domain);
  }

  async getStatus(domain: string): Promise<DomainStatus> {
    const instructions = instructionsFor(domain);
    const expected = instructions[0]?.value;
    if (!expected) {
      return { verified: false, instructions };
    }
    try {
      if (isApexDomain(domain)) {
        const addresses = await resolve4(domain);
        return { verified: addresses.includes(expected), instructions };
      }
      const targets = await resolveCname(domain);
      return {
        verified: targets.some(
          (t) => stripTrailingDot(t) === stripTrailingDot(expected),
        ),
        instructions,
      };
    } catch {
      return { verified: false, instructions };
    }
  }

  async removeDomain(): Promise<void> {
    // No external registration to clean up in dev mode.
  }
}
