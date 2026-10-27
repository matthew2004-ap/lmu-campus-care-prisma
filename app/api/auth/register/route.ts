import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return NextResponse.json({ error: 'AUTH_SECRET is not configured. Copy .env.example to .env.local and set a 32+ character secret.' }, { status: 503 });
    const body = await req.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const matric = String(body.matric || '').trim();
    const hall = String(body.hall || '').trim();
    if (name.length < 2 || name.length > 100) return NextResponse.json({ error: 'Enter your full name.' }, { status: 400 });
    if (!/^[^\s@]+@lmu\.edu\.ng$/.test(email)) return NextResponse.json({ error: 'Use your official @lmu.edu.ng school email address.' }, { status: 400 });
    if (password.length < 10) return NextResponse.json({ error: 'Use a password with at least 10 characters.' }, { status: 400 });
    if (!matric || matric.length > 40) return NextResponse.json({ error: 'Enter your registration / matric number.' }, { status: 400 });
    const existing = await prisma.profile.findFirst({ where: { OR: [{ email }, { matric_no: matric }] } });
    if (existing) return NextResponse.json({ error: existing.email === email ? 'An account already exists for this email.' : 'This matric number is already registered.' }, { status: 409 });
    const user = await prisma.profile.create({ data: { full_name: name, email, password_hash: await bcrypt.hash(password, 12), matric_no: matric, hall: hall || null, role: 'student' } });
    const token = await createSessionToken(user);
    const response = NextResponse.json({ user: { id: user.id, name: user.full_name, email: user.email, matric: user.matric_no, hall: user.hall, avatar: user.avatar_url, role: user.role, councilRole: null } }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 604800 });
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Registration failed.';
    return NextResponse.json({ error: message.includes('AUTH_SECRET') ? message : 'Could not create the account. Check your internet connection.' }, { status: 500 });
  }
}
