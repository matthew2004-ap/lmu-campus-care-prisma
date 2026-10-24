import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/messages/[id]
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await getAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to view this message.' },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const message = await prisma.message.findFirst({
      where: {
        id,
        OR: [
          { sender_id: user.id },
          { recipient_id: user.id },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
            council_role: true,
          },
        },
        recipient: {
          select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
            council_role: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found.' },
        { status: 404 },
      );
    }

    // Only the recipient can mark the message as read.
    let result = message;

    if (
      message.recipient_id === user.id &&
      !message.is_read
    ) {
      result = await prisma.message.update({
        where: { id: message.id },
        data: {
          is_read: true,
          read_at: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              full_name: true,
              email: true,
              role: true,
              council_role: true,
            },
          },
          recipient: {
            select: {
              id: true,
              full_name: true,
              email: true,
              role: true,
              council_role: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      message: {
        id: result.id,
        subject: result.subject,
        body: result.body,
        isRead: result.is_read,
        readAt: result.read_at,
        createdAt: result.created_at,
        sender: result.sender,
        recipient: result.recipient,
      },
    });
  } catch (error) {
    console.error('GET /api/messages/[id]:', error);

    return NextResponse.json(
      { error: 'Unable to retrieve this message.' },
      { status: 500 },
    );
  }
}

