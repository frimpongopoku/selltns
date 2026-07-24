import { Injectable } from '@nestjs/common';
import { teamMembers } from '../common/seed-data';

@Injectable()
export class AuthService {
  mockGoogleLogin() {
    const user = teamMembers[0];
    return {
      accessToken: 'mock.jwt.access-token',
      refreshToken: 'mock.jwt.refresh-token',
      user,
    };
  }

  me() {
    return teamMembers[0];
  }
}
