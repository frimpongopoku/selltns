export const DOMAIN_PROVIDER = Symbol('DOMAIN_PROVIDER');

export interface DnsInstruction {
  type: 'A' | 'CNAME';
  /** Record name/host, e.g. "@" for the apex or "www" for a subdomain. */
  host: string;
  /** Target IP (A record) or hostname (CNAME record). */
  value: string;
}

export interface DomainStatus {
  verified: boolean;
  instructions: DnsInstruction[];
}

export interface DomainProvider {
  addDomain(domain: string): Promise<DomainStatus>;
  getStatus(domain: string): Promise<DomainStatus>;
  removeDomain(domain: string): Promise<void>;
}
