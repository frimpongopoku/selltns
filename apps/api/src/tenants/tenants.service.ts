import { Injectable } from '@nestjs/common';
import { tenant } from '../common/seed-data';
import { Tenant, ThemeTokens } from '../common/types';

@Injectable()
export class TenantsService {
  private current: Tenant = { ...tenant };

  findCurrent(): Tenant {
    return this.current;
  }

  updateTheme(themeTokens: ThemeTokens): Tenant {
    this.current = { ...this.current, themeTokens };
    return this.current;
  }
}
