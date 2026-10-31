import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import {
  createSessionToken,
  SESSION_COOKIE,
  isCouncil,
} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    if (
      !process.env.AUTH_SECRET ||
      process.env.AUTH_SECRET.length < 32
    ) {
      return NextResponse.json(
        { error: 'Authentication is not configured.' },
        { status: 503 }
      );
    }

    const body = await req.json();

    const email = String(body.email || '')
      .trim()
      .toLowerCase();

    const password = String(body.password || '');
    const portal = body.portal || 'student';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Enter your email and password.' },
        { status: 400 }
      );
    }

    const user = await prisma.profile.findUnique({
      where: { email },
    });

    // Google-only accounts do not have passwords.
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: 'Email or password is incorrect.' },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Email or password is incorrect.' },
        { status: 401 }
      );
    }

    const council = isCouncil({
      role: user.role,
      councilRole: user.council_role,
    });

    if (portal === 'council') {
      if (!council || !user.council_active) {
        return NextResponse.json(
          { error: 'This account is not authorised for Council Access.' },
          { status: 403 }
        );
      }
    } else if (portal === 'student') {
      if (user.role !== 'student') {
        return NextResponse.json(
          { error: 'This account is not authorised for Student Access.' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid login portal.' },
        { status: 400 }
      );
    }

    const token = await createSessionToken(user);

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        matric: user.matric_no,
        hall: user.hall,
        avatar: user.avatar_url,
        role: user.role,
        councilRole: user.council_role,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { error: 'Unable to sign in. Please try again.' },
      { status: 500 }
    );
  }
}