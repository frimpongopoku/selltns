import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard, type SessionPayload } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { RegisterDto } from './dto/register.dto';
import type { GoogleLoginDto } from './dto/google-login.dto';
import type { CreateSpaceDto } from './dto/create-space.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('google')
  googleLogin(@Body() body: GoogleLoginDto) {
    return this.authService.googleLogin(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: SessionPayload) {
    return this.authService.me(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('spaces')
  createSpace(
    @CurrentUser() user: SessionPayload,
    @Body() body: CreateSpaceDto,
  ) {
    return this.authService.createSpace(user, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch')
  switchSpace(
    @CurrentUser() user: SessionPayload,
    @Body() body: { tenantId: string },
  ) {
    return this.authService.switchSpace(user, body.tenantId);
  }
}
