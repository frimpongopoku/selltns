import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VerificationService } from './verification.service';
import { MAX_UPLOAD_BYTES } from '../media/media.constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

interface VerificationFiles {
  idPhoto?: Express.Multer.File[];
  selfiePhoto?: Express.Multer.File[];
}

// Owner-only: this is the vendor's own personal ID data, not something a
// manager or staff member should be submitting or viewing on their behalf.
@Controller('verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  getStatus(@CurrentUser() user: SessionPayload) {
    return this.verificationService.getStatus(user.tenantId);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idPhoto', maxCount: 1 },
        { name: 'selfiePhoto', maxCount: 1 },
      ],
      { limits: { fileSize: MAX_UPLOAD_BYTES } },
    ),
  )
  submit(
    @UploadedFiles() files: VerificationFiles,
    @CurrentUser() user: SessionPayload,
    @Body('legalName') legalName?: string,
    @Body('ghanaCardNumber') ghanaCardNumber?: string,
  ) {
    return this.verificationService.submit(user.tenantId, {
      legalName,
      ghanaCardNumber,
      idPhoto: files.idPhoto?.[0],
      selfiePhoto: files.selfiePhoto?.[0],
    });
  }
}
