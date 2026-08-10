import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminGuard } from './superadmin-session.guard';
import { CurrentSuperAdmin } from './current-superadmin.decorator';
import type { SuperAdminSessionPayload } from './superadmin-session.guard';
import type { VerificationRequestStatus } from '@prisma/client';

const VERIFICATION_STATUSES: VerificationRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

@Controller('superadmin')
@UseGuards(SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('overview')
  overview() {
    return this.superAdminService.overview();
  }

  @Get('verifications')
  listVerifications(@Query('status') status?: string) {
    if (status && !VERIFICATION_STATUSES.includes(status as VerificationRequestStatus)) {
      throw new BadRequestException('Invalid status filter');
    }
    return this.superAdminService.listVerifications(
      status as VerificationRequestStatus | undefined,
    );
  }

  @Get('verifications/:id')
  getVerification(@Param('id') id: string) {
    return this.superAdminService.getVerification(id);
  }

  @Get('verifications/:id/photo/:kind')
  async getVerificationPhoto(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @Res() res: Response,
  ) {
    if (kind !== 'id' && kind !== 'selfie') {
      throw new BadRequestException('kind must be "id" or "selfie"');
    }
    const { buffer, contentType } = await this.superAdminService.getVerificationPhoto(
      id,
      kind,
    );
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, no-store');
    res.send(buffer);
  }

  @Post('verifications/:id/approve')
  approveVerification(
    @Param('id') id: string,
    @CurrentSuperAdmin() superAdmin: SuperAdminSessionPayload,
  ) {
    return this.superAdminService.approveVerification(id, superAdmin.sub);
  }

  @Post('verifications/:id/reject')
  rejectVerification(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentSuperAdmin() superAdmin: SuperAdminSessionPayload,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('A rejection reason is required.');
    }
    return this.superAdminService.rejectVerification(id, reason.trim(), superAdmin.sub);
  }

  @Get('tenants')
  listTenants(@Query('q') q?: string, @Query('cursor') cursor?: string) {
    return this.superAdminService.listTenants(q, cursor);
  }

  @Get('tenants/:id')
  getTenantDetail(@Param('id') id: string) {
    return this.superAdminService.getTenantDetail(id);
  }

  @Post('users/:id/verify')
  verifyUser(@Param('id') id: string) {
    return this.superAdminService.verifyUserById(id);
  }

  @Post('users/:id/unverify')
  unverifyUser(@Param('id') id: string) {
    return this.superAdminService.unverifyUserById(id);
  }

  @Post('tenants/:id/suspend')
  suspendTenant(@Param('id') id: string, @Body('reason') reason: string) {
    if (!reason?.trim()) {
      throw new BadRequestException('A suspension reason is required.');
    }
    return this.superAdminService.suspendTenant(id, reason.trim());
  }

  @Post('tenants/:id/unsuspend')
  unsuspendTenant(@Param('id') id: string) {
    return this.superAdminService.unsuspendTenant(id);
  }

  @Get('admins')
  listAdmins() {
    return this.superAdminService.listAdmins();
  }

  @Post('admins/invite')
  inviteAdmin(@Body('email') email: string) {
    return this.superAdminService.inviteAdmin(email);
  }
}
