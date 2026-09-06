import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupportService } from './support.service';
import type { SubmitSupportMessageInput } from './support.service';

// Public — this is the platform's help/contact form (apps/web's /help and
// /[slug]/help), reachable by logged-out shoppers and vendors alike.
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // Already has a honeypot + fill-time check in the service (see
  // support.service.ts) — this throttle is defense in depth on top of that.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('contact')
  submit(@Body() body: SubmitSupportMessageInput) {
    return this.supportService.submit(body);
  }
}
