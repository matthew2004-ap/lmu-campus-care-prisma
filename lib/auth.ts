import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'campuscare-session';

function secret() {
  const value = process.env.AUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error(
      'AUTH_SECRET must be configured with at least 32 characters.'
    );
  }

  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: {
  id: string;
  email: string;
  role: string;
  council_role: string | null;
}) {
  return new SignJWT({
    email: user.email,
    role: user.role,
    councilRole: user.council_role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function getAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, secret());

    if (!payload.sub) return null;

    const user = await prisma.profile.findUnique({
      where: { id: String(payload.sub) },
    });

    if (!user) return null;

    // Council accounts must be active.
    if (user.role === 'council' && !user.council_active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.full_name,
      matric: user.matric_no,
      hall: user.hall,
      avatar: user.avatar_url,
      role: user.role,
      councilRole: user.council_role,
    };
  } catch {
    return null;
  }
}

export function isCouncil(user: {
  role: string;
  councilRole: string | null;
}) {
  return (
    user.role === 'council' &&
    ['welfare', 'transport', 'pro', 'vcm'].includes(
      user.councilRole || ''
    )
  );
}

export async function addAudit(
  actorId: string,
  actorLabel: string,
  message: string,
  severity = 'info'
) {
  await prisma.auditLog
    .create({
      data: {
        actor_id: actorId,
        actor_label: actorLabel,
        message,
        severity,
      },
    })
    .catch(() => undefined);
}