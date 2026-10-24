import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';
export async function GET(req: Request) {
  const url = new URL(req.url); const code = url.searchParams.get('code'); const state = url.searchParams.get('state'); const cookieStore = await cookies();
  const expectedState = cookieStore.get('campuscare-google-state')?.value;
  const fail = (reason: string) => { const r = NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(reason)}`, url.origin)); r.cookies.set('campuscare-google-state', '', { path: '/', maxAge: 0 }); return r; };
  if (!code || !state || !expectedState || state !== expectedState) return fail('google-state');
  const clientId = process.env.GOOGLE_CLIENT_ID; const clientSecret = process.env.GOOGLE_CLIENT_SECRET; const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  if (!clientId || !clientSecret) return fail('google-not-configured');
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }) });
    const token = await tokenRes.json(); if (!tokenRes.ok || !token.access_token) return fail('google-token');
    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${token.access_token}` } }); const info = await infoRes.json();
    const email = String(info.email || '').toLowerCase(); if (!info.email_verified || !email.endsWith('@lmu.edu.ng')) return fail('google-domain');
    const user = await prisma.profile.findUnique({ where: { email } });
    if (!user || user.role !== 'student' || !user.council_active) return fail('google-account-not-found');
    const session = await createSessionToken(user); const response = NextResponse.redirect(new URL('/student', url.origin));
    response.cookies.set(SESSION_COOKIE, session, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 604800 });
    response.cookies.set('campuscare-google-state', '', { httpOnly: true, path: '/', maxAge: 0 }); return response;
  } catch { return fail('google-signin-failed'); }
}
