import type { DnsInstruction } from './domain-provider';

/**
 * Crude apex-vs-subdomain check: "mintsui.com" (2 labels) is an apex domain
 * and needs an A record; "shop.mintsui.com" or "www.mintsui.com" (3+ labels)
 * needs a CNAME. Doesn't consult a public-suffix list, so a domain like
 * "mintsui.co.uk" is misread as a subdomain — acceptable for v1 given how
 * rare non-standard TLDs are among vendors; revisit if it comes up.
 */
export function isApexDomain(domain: string): boolean {
  return domain.split('.').length === 2;
}

export function instructionsFor(domain: string): DnsInstruction[] {
  if (isApexDomain(domain)) {
    // A bare domain needs the apex A record to resolve at all, plus a www
    // CNAME so the common "www.yourshop.com" variant also works — vendors
    // shouldn't have to come back and add that themselves.
    return [
      { type: 'A', host: '@', value: process.env.PLATFORM_APEX_IP ?? '' },
      { type: 'CNAME', host: 'www', value: process.env.PLATFORM_CNAME_TARGET ?? '' },
    ];
  }
  const host = domain.split('.')[0];
  return [
    { type: 'CNAME', host, value: process.env.PLATFORM_CNAME_TARGET ?? '' },
  ];
}
