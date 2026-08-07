import { Logger, Module } from '@nestjs/common';
import { DOMAIN_PROVIDER } from './domain-provider';
import { VercelDomainProvider } from './vercel-domain-provider.service';
import { ManualDnsDomainProvider } from './manual-dns-domain-provider.service';

const logger = new Logger('DomainsModule');

@Module({
  providers: [
    {
      provide: DOMAIN_PROVIDER,
      useFactory: () => {
        if (process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID) {
          logger.log(
            'Using Vercel for custom domain registration and verification.',
          );
          return new VercelDomainProvider();
        }
        logger.warn(
          'VERCEL_API_TOKEN/VERCEL_PROJECT_ID not set — falling back to a plain DNS lookup ' +
            'for domain verification. Fine for local dev, must not run in production.',
        );
        return new ManualDnsDomainProvider();
      },
    },
  ],
  exports: [DOMAIN_PROVIDER],
})
export class DomainsModule {}
