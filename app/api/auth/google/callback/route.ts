import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { prisma } from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';

// Google's public keys used to verify Google ID tokens.
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieStore = await cookies();

  const expectedState = cookieStore.get(
    'campuscare-google-state'
  )?.value;

  const secure = process.env.NODE_ENV === 'production';

  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set('campuscare-google-state', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  };

  const fail = (reason: string) => {
    const response = NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(reason)}`, url.origin)
    );

    return clearStateCookie(response);
  };

  // Verify OAuth state to protect against CSRF.
  if (
    !code ||
    !state ||
    !expectedState ||
    state !== expectedState
  ) {
    return fail('google-state');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${url.origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return fail('google-not-configured');
  }

  try {
    // Exchange authorization code for Google tokens.
    const tokenRes = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
        cache: 'no-store',
      }
    );

    if (!tokenRes.ok) {
      return fail('google-token');
    }

    const tokenData = await tokenRes.json();

    if (
      typeof tokenData.id_token !== 'string' ||
      !tokenData.id_token
    ) {
      return fail('google-id-token-missing');
    }

    // Verify the signature, issuer, audience and expiry of Google's ID token.
    const { payload } = await jwtVerify(
      tokenData.id_token,
      GOOGLE_JWKS,
      {
        issuer: [
          'https://accounts.google.com',
          'accounts.google.com',
        ],
        audience: clientId,
      }
    );

    // Read verified Google account information.
    const email =
      typeof payload.email === 'string'
        ? payload.email.toLowerCase().trim()
        : '';

    const hostedDomain =
      typeof payload.hd === 'string'
        ? payload.hd.toLowerCase()
        : '';

    const emailDomain = email.split('@')[1];

    // Require a verified Landmark University Google Workspace account.
    if (
      payload.email_verified !== true ||
      hostedDomain !== 'lmu.edu.ng' ||
      emailDomain !== 'lmu.edu.ng'
    ) {
      return fail('google-domain');
    }

    // Find the existing CampusCare student account.
    const user = await prisma.profile.findUnique({
      where: { email },
    });

    // Only student accounts can use this student Google login.
    if (!user || user.role !== 'student') {
      return fail('google-account-not-found');
    }

    // Create CampusCare session.
    const session = await createSessionToken(user);

    const response = NextResponse.redirect(
      new URL('/student', url.origin)
    );

    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    });

    return clearStateCookie(response);

  } catch (error) {
    console.error('Google authentication error:', error);

    return fail('google-signin-failed');
  }
}