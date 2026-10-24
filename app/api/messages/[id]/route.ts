
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to continue.' },
        { status: 401 }
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
            avatar_url: true,
          },
        },
        recipient: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found.' },
        { status: 404 }
      );
    }

    // Mark the message as read only when the recipient opens it.
    if (
      message.recipient_id === user.id &&
      !message.is_read
    ) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      message: {
        id: message.id,
        subject: message.subject,
        body: message.body,
        isRead: message.is_read,
        readAt: message.read_at,
        createdAt: message.created_at,
        senderId: message.sender_id,
        recipientId: message.recipient_id,

        sender: {
          id: message.sender.id,
          name: message.sender.full_name,
          email: message.sender.email,
          avatar: message.sender.avatar_url,
        },

        recipient: {
          id: message.recipient.id,
          name: message.recipient.full_name,
          email: message.recipient.email,
          avatar: message.recipient.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error('Get message error:', error);

    return NextResponse.json(
      { error: 'Unable to load this message.' },
      { status: 500 }
    );
  }
}

