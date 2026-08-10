import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseVerifierService } from './firebase-verifier.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

// Global so every other module's controllers can reference JwtAuthGuard /
// RolesGuard via @UseGuards(...) without each importing AuthModule — those
// guards need JwtService (from JwtModule below) resolvable wherever they're
// instantiated, which requires this module (and its exports) to be global.
@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, FirebaseVerifierService, JwtAuthGuard, RolesGuard],
  // FirebaseVerifierService is also used by SuperAdminModule's parallel
  // Google-login path (same Firebase project, different allowlist table).
  exports: [JwtAuthGuard, RolesGuard, FirebaseVerifierService],
})
export class AuthModule {}
