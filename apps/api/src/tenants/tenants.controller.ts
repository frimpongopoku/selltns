import { Body, Controller, Get, Patch } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import type { ThemeTokens } from '../common/types';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  getCurrent() {
    return this.tenantsService.findCurrent();
  }

  @Patch('current/theme')
  updateTheme(@Body() themeTokens: ThemeTokens) {
    return this.tenantsService.updateTheme(themeTokens);
  }
}
