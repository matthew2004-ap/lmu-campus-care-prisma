import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, isCouncil, addAudit } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const COUNCIL_ROLES = ['welfare', 'transport', 'pro', 'vcm'];

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function serializeMessage(message: any) {
  return {
    id: message.id,
    subject: message.subject,
    body: message.body,
    isRead: message.is_read,
    readAt: message.read_at,
    emailStatus: message.email_status,
    createdAt: message.created_at,
    sender: message.sender
      ? {
          id: message.sender.id,
          name: message.sender.full_name,
          email: message.sender.email,
          role: message.sender.role,
          councilRole: message.sender.council_role,
        }
      : undefined,
    recipient: message.recipient
      ? {
          id: message.recipient.id,
          name: message.recipient.full_name,
          email: message.recipient.email,
          role: message.recipient.role,
          councilRole: message.recipient.council_role,
        }
      : undefined,
  };
}

// GET /api/messages?folder=inbox
// GET /api/messages?folder=sent
export async function GET(request: NextRequest) {
  try {
    const user = await getAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to access your messages.' },
        { status: 401 },
      );
    }

    const folder =
      request.nextUrl.searchParams.get('folder') === 'sent'
        ? 'sent'
        : 'inbox';

    const messages = await prisma.message.findMany({
      where:
        folder === 'sent'
          ? { sender_id: user.id }
          : { recipient_id: user.id },
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
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      messages: messages.map(serializeMessage),
    });
  } catch (error) {
    console.error('GET /api/messages:', error);

    return NextResponse.json(
      { error: 'Unable to retrieve messages.' },
      { status: 500 },
    );
  }
}

// POST /api/messages
export async function POST(request: NextRequest) {
  try {
    const user = await getAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in before sending a message.' },
        { status: 401 },
      );
    }

    // Reject cross-origin browser submissions.
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json(
            { error: 'Invalid request origin.' },
            { status: 403 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid request origin.' },
          { status: 403 },
        );
      }
    }

    const contentLength = Number(
      request.headers.get('content-length') || 0,
    );

    if (contentLength > 20_000) {
      return NextResponse.json(
        { error: 'The message request is too large.' },
        { status: 413 },
      );
    }

    const payload = await request.json().catch(() => null);

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 },
      );
    }

    const recipientId = cleanText(payload.recipientId, 100);
    const subject = cleanText(payload.subject, 200);
    const body = cleanText(payload.body, 10_000);

    if (!recipientId || !subject || !body) {
      return NextResponse.json(
        { error: 'Recipient, subject, and message are required.' },
        { status: 400 },
      );
    }

    if (recipientId === user.id) {
      return NextResponse.json(
        { error: 'You cannot send a message to yourself.' },
        { status: 400 },
      );
    }

    if (
      subject.length < 2 ||
      body.length < 2
    ) {
      return NextResponse.json(
        { error: 'Subject and message must contain at least two characters.' },
        { status: 400 },
      );
    }

    const recipient = await prisma.profile.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        role: true,
        council_role: true,
        council_active: true,
      },
    });

    if (!recipient || !recipient.council_active) {
      return NextResponse.json(
        { error: 'The selected recipient is unavailable.' },
        { status: 404 },
      );
    }

    // Students may message other students or active council members.
    // Council members may also message students and other council members.
    if (
      recipient.role === 'council' &&
      !COUNCIL_ROLES.includes(recipient.council_role || '')
    ) {
      return NextResponse.json(
        { error: 'This recipient is not an authorized council member.' },
        { status: 403 },
      );
    }

    const message = await prisma.message.create({
      data: {
        sender_id: user.id,
        recipient_id: recipient.id,
        subject,
        body,
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

    await addAudit(
      user.id,
      user.name,
      `Sent an in-app message to ${recipient.id}.`,
    );

    return NextResponse.json(
      { message: serializeMessage(message) },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/messages:', error);

    return NextResponse.json(
      { error: 'Unable to send your message.' },
      { status: 500 },
    );
  }
}

