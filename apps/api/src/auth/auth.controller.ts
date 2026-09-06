import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard, type SessionPayload } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { RegisterDto } from './dto/register.dto';
import type { GoogleLoginDto } from './dto/google-login.dto';
import type { CreateSpaceDto } from './dto/create-space.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Public, unauthenticated, and creates a tenant + user per call — tighter
  // than the global default so a bot can't mass-create junk stores.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  // Public, unauthenticated — tightened against credential-stuffing-style
  // hammering of the login endpoint.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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
