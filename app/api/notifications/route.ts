
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}

// GET /api/notifications
// GET /api/notifications?unreadOnly=true
export async function GET(request: NextRequest) {
  try {
    const user = await getAuth();

    if (!user) {
      return errorResponse('Please sign in to view notifications.', 401);
    }

    const unreadOnly =
      request.nextUrl.searchParams.get('unreadOnly') === 'true';

    const where = {
      user_id: user.id,
      ...(unreadOnly ? { is_read: false } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          link: true,
          is_read: true,
          read_at: true,
          created_at: true,
        },
      }),

      prisma.notification.count({
        where: {
          user_id: user.id,
          is_read: false,
        },
      }),
    ]);

    return NextResponse.json(
      {
        notifications: notifications.map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type,
          link: item.link,
          isRead: item.is_read,
          readAt: item.read_at,
          createdAt: item.created_at,
        })),
        unreadCount,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (error) {
    console.error('GET /api/notifications failed:', error);

    return errorResponse('Unable to retrieve notifications.', 500);
  }
}

// PATCH /api/notifications
// Body: { "markAllRead": true }
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuth();

    if (!user) {
      return errorResponse('Please sign in to update notifications.', 401);
    }

    // Basic same-origin check for browser requests.
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        const isSecure = originUrl.protocol === 'https:';
        const isLocalHttp =
          originUrl.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(originUrl.hostname);

        if (
          originUrl.host.toLowerCase() !== host.toLowerCase() ||
          (!isSecure && !isLocalHttp)
        ) {
          return errorResponse('Invalid request origin.', 403);
        }
      } catch {
        return errorResponse('Invalid request origin.', 403);
      }
    }

    const payload = await request.json().catch(() => null);

    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      (payload as Record<string, unknown>).markAllRead !== true
    ) {
      return errorResponse('Invalid notification update request.', 400);
    }

    const result = await prisma.notification.updateMany({
      where: {
        user_id: user.id,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        updatedCount: result.count,
      },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  } catch (error) {
    console.error('PATCH /api/notifications failed:', error);

    return errorResponse('Unable to update notifications.', 500);
  }
}

