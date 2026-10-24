
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}

// PATCH /api/notifications/[id]
// Marks one notification as read.
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
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

    const { id } = await context.params;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(id)) {
      return errorResponse('Invalid notification ID.', 400);
    }

    const result = await prisma.notification.updateMany({
      where: {
        id,
        user_id: user.id,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    if (result.count === 0) {
      // Check whether this notification belongs to the current user.
      const notification = await prisma.notification.findFirst({
        where: {
          id,
          user_id: user.id,
        },
        select: {
          id: true,
          is_read: true,
          read_at: true,
        },
      });

      if (!notification) {
        return errorResponse('Notification not found.', 404);
      }

      return NextResponse.json(
        {
          success: true,
          alreadyRead: true,
          notification: {
            id: notification.id,
            isRead: notification.is_read,
            readAt: notification.read_at,
          },
        },
        {
          headers: { 'Cache-Control': 'private, no-store' },
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        notification: {
          id,
          isRead: true,
          readAt: new Date(),
        },
      },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  } catch (error) {
    console.error('PATCH /api/notifications/[id] failed:', error);

    return errorResponse('Unable to update this notification.', 500);
  }
}

