import { Body, Controller, Post } from '@nestjs/common';
import { SupportService } from './support.service';
import type { SubmitSupportMessageInput } from './support.service';

// Public — this is the platform's help/contact form (apps/web's /help and
// /[slug]/help), reachable by logged-out shoppers and vendors alike.
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('contact')
  submit(@Body() body: SubmitSupportMessageInput) {
    return this.supportService.submit(body);
  }
}
