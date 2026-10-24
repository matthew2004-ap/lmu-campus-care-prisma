
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to view available recipients.' },
        { status: 401 },
      );
    }

    const recipients = await prisma.profile.findMany({
      where: {
        id: { not: user.id },
        council_active: true,
        OR: [
          { role: 'student' },
          {
            role: 'council',
            council_role: {
              in: ['welfare', 'transport', 'pro', 'vcm'],
            },
          },
        ],
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        council_role: true,
      },
      orderBy: {
        full_name: 'asc',
      },
    });

    return NextResponse.json({
      recipients: recipients.map((recipient) => ({
        id: recipient.id,
        name: recipient.full_name,
        email: recipient.email,
        role: recipient.role,
        councilRole: recipient.council_role,
      })),
    });
  } catch (error) {
    console.error('GET /api/messages/recipients:', error);

    return NextResponse.json(
      { error: 'Unable to retrieve available recipients.' },
      { status: 500 },
    );
  }
}

