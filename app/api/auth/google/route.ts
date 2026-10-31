import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${new URL(req.url).origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/auth?error=google-not-configured', req.url)
    );
  }

  // Generate a secure state value to protect the OAuth flow.
  const state = randomBytes(32).toString('hex');

  // Build Google's authentication URL.
  const googleUrl = new URL(
    'https://accounts.google.com/o/oauth2/v2/auth'
  );

  googleUrl.searchParams.set('client_id', clientId);
  googleUrl.searchParams.set('redirect_uri', redirectUri);
  googleUrl.searchParams.set('response_type', 'code');

  // Request only basic Google account information.
  googleUrl.searchParams.set(
    'scope',
    'openid email profile'
  );

  googleUrl.searchParams.set('state', state);

  // Encourage students to select their Landmark University account.
  googleUrl.searchParams.set('hd', 'lmu.edu.ng');

  // Allow users to select the account they want to use.
  googleUrl.searchParams.set('prompt', 'select_account');

  const secure = process.env.NODE_ENV === 'production';

  const response = NextResponse.redirect(googleUrl);

  response.cookies.set('campuscare-google-state', state, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  response.headers.set('Cache-Control', 'no-store');

  return response;
}