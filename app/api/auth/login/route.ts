import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE, isCouncil } from '@/lib/auth';
export async function POST(req: Request) {
  try {
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return NextResponse.json({ error: 'AUTH_SECRET is not configured. Set it in .env.local before signing in.' }, { status: 503 });
    const { email: rawEmail, password, portal = 'student' } = await req.json();
    const email = String(rawEmail || '').trim().toLowerCase();
    const user = await prisma.profile.findUnique({ where: { email } });
    if (!user || !user.council_active || !(await bcrypt.compare(String(password || ''), user.password_hash))) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    const council = isCouncil({ role: user.role, councilRole: user.council_role });
    if (portal === 'council' && !council) return NextResponse.json({ error: 'This account is not authorised for Council Access.' }, { status: 403 });
    if (portal === 'student' && council) return NextResponse.json({ error: 'This is a council account. Choose Council Access.' }, { status: 403 });
    const token = await createSessionToken(user);
    const response = NextResponse.json({ user: { id: user.id, name: user.full_name, email: user.email, matric: user.matric_no, hall: user.hall, avatar: user.avatar_url, role: user.role, councilRole: user.council_role } });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 604800 });
    return response;
  } catch (e) {
    const message = e instanceof Error && e.message.includes('AUTH_SECRET') ? e.message : 'Unable to sign in. Check your database and configuration.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
