import { Injectable, UnauthorizedException } from '@nestjs/common';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

export interface VerifiedGoogleUser {
  email: string;
  name: string;
  sub: string;
}

@Injectable()
export class FirebaseVerifierService {
  private readonly auth: Auth;

  constructor() {
    const app = getApps().length
      ? getApp()
      : initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
          }),
        });
    this.auth = getAuth(app);
  }

  async verify(idToken: string): Promise<VerifiedGoogleUser> {
    if (!idToken) {
      throw new UnauthorizedException('Missing Firebase ID token');
    }

    const decoded = await this.auth.verifyIdToken(idToken).catch(() => {
      throw new UnauthorizedException('Invalid Firebase token');
    });

    if (!decoded.email || !decoded.email_verified) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    return {
      email: decoded.email.toLowerCase(),
      name: (decoded.name as string | undefined) ?? decoded.email,
      sub: decoded.uid,
    };
  }
}
