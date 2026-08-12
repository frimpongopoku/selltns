import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { SuperAdminBillingController } from './superadmin-billing.controller';
import { BillingService } from './billing.service';
import { EmailModule } from '../email/email.module';
import { SuperAdminGuard } from '../superadmin/superadmin-session.guard';

@Module({
  imports: [EmailModule],
  controllers: [BillingController, SuperAdminBillingController],
  providers: [BillingService, SuperAdminGuard],
})
export class BillingModule {}
