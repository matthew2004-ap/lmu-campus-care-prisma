import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
export async function GET(req: Request) {
  const id = process.env.GOOGLE_CLIENT_ID; const redirect = process.env.GOOGLE_REDIRECT_URI || `${new URL(req.url).origin}/api/auth/google/callback`;
  if (!id || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(new URL('/auth?error=google-not-configured', req.url));
  const state = randomBytes(24).toString('hex');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', id); url.searchParams.set('redirect_uri', redirect); url.searchParams.set('response_type', 'code'); url.searchParams.set('scope', 'openid email profile'); url.searchParams.set('state', state); url.searchParams.set('prompt', 'select_account');
  const res = NextResponse.redirect(url); res.cookies.set('campuscare-google-state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 }); return res;
}
