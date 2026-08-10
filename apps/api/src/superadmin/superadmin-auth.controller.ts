import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SuperAdminAuthService } from './superadmin-auth.service';
import { SuperAdminGuard } from './superadmin-session.guard';
import { CurrentSuperAdmin } from './current-superadmin.decorator';
import type { GoogleLoginDto } from '../auth/dto/google-login.dto';
import type { SuperAdminSessionPayload } from './superadmin-session.guard';

@Controller('superadmin/auth')
export class SuperAdminAuthController {
  constructor(private readonly authService: SuperAdminAuthService) {}

  @Post('google')
  googleLogin(@Body() body: GoogleLoginDto) {
    return this.authService.googleLogin(body);
  }

  @UseGuards(SuperAdminGuard)
  @Get('me')
  me(@CurrentSuperAdmin() superAdmin: SuperAdminSessionPayload) {
    return this.authService.me(superAdmin);
  }
}
