import { Module } from '@nestjs/common';
import { SuperAdminAuthController } from './superadmin-auth.controller';
import { SuperAdminAuthService } from './superadmin-auth.service';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminGuard } from './superadmin-session.guard';
import { EmailModule } from '../email/email.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  // VerificationModule is imported for its exported PRIVATE_STORAGE_SERVICE
  // provider (see verification.module.ts) — superadmins need to read back
  // the same private-storage documents vendors submit there.
  imports: [EmailModule, VerificationModule],
  controllers: [SuperAdminAuthController, SuperAdminController],
  providers: [SuperAdminAuthService, SuperAdminService, SuperAdminGuard],
})
export class SuperAdminModule {}
