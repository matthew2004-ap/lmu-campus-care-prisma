
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, addAudit } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const COUNCIL_ROLES = ['welfare', 'transport', 'pro', 'vcm'];

const MAX_BODY_LENGTH = 10_000;
const MAX_SUBJECT_LENGTH = 200;
const MAX_REQUEST_SIZE = 20_000;
const MAX_MESSAGES_PER_MINUTE = 10;

// In-memory rate limiter.
// Note: for production deployments with multiple server instances,
// replace this with a shared store such as Redis.
const sendAttempts = new Map<string, number[]>();

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
    attachments: (message.attachments || []).map((attachment: any) => ({
      id: attachment.id,
      fileName: attachment.file_name,
      fileUrl: attachment.file_url,
      mimeType: attachment.mime_type,
      fileSize: attachment.file_size,
      createdAt: attachment.created_at,
    })),
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

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;

  const recentAttempts = (sendAttempts.get(userId) || []).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (recentAttempts.length >= MAX_MESSAGES_PER_MINUTE) {
    sendAttempts.set(userId, recentAttempts);
    return false;
  }

  recentAttempts.push(now);
  sendAttempts.set(userId, recentAttempts);

  // Prevent this map from growing indefinitely.
  if (sendAttempts.size > 5_000) {
    for (const [id, timestamps] of sendAttempts.entries()) {
      const activeTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < windowMs,
      );

      if (activeTimestamps.length === 0) {
        sendAttempts.delete(id);
      } else {
        sendAttempts.set(id, activeTimestamps);
      }
    }
  }

  return true;
}

async function getAuthenticatedUser() {
  const user = await getAuth();

  if (!user) {
    return null;
  }

  return user;
}

// GET /api/messages?folder=inbox
// GET /api/messages?folder=sent
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return jsonError('Please sign in to access your messages.', 401);
    }

    const requestedFolder = request.nextUrl.searchParams.get('folder');
    const folder = requestedFolder === 'sent' ? 'sent' : 'inbox';

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
        attachments: {
          select: {
            id: true,
            file_name: true,
            file_url: true,
            mime_type: true,
            file_size: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return NextResponse.json(
      {
        messages: messages.map(serializeMessage),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (error) {
    console.error('GET /api/messages failed:', error);

    return jsonError('Unable to retrieve messages.', 500);
  }
}

// POST /api/messages
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return jsonError('Please sign in before sending a message.', 401);
    }

    // Check request origin to reduce cross-origin browser submissions.
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
          return jsonError('Invalid request origin.', 403);
        }
      } catch {
        return jsonError('Invalid request origin.', 403);
      }
    }

    const contentLength = Number(
      request.headers.get('content-length') || 0,
    );

    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
      return jsonError('The message request is too large.', 413);
    }

    // Reject requests whose declared or actual body is too large.
    const rawBody = await request.text();

    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_SIZE) {
      return jsonError('The message request is too large.', 413);
    }

    let payload: Record<string, unknown>;

    try {
      const parsed: unknown = JSON.parse(rawBody);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return jsonError('Invalid request body.', 400);
      }

      payload = parsed as Record<string, unknown>;
    } catch {
      return jsonError('Invalid JSON request body.', 400);
    }

    const recipientId = cleanText(payload.recipientId, 100);
    const subject = cleanText(payload.subject, MAX_SUBJECT_LENGTH);
    const body = cleanText(payload.body, MAX_BODY_LENGTH);

    if (!recipientId || !subject || !body) {
      return jsonError(
        'Recipient, subject, and message are required.',
        400,
      );
    }

    if (!isValidUuid(recipientId)) {
      return jsonError('The selected recipient is invalid.', 400);
    }

    if (recipientId === user.id) {
      return jsonError('You cannot send a message to yourself.', 400);
    }

    if (subject.length < 2 || body.length < 2) {
      return jsonError(
        'Subject and message must contain at least two characters.',
        400,
      );
    }

    if (subject.length > MAX_SUBJECT_LENGTH || body.length > MAX_BODY_LENGTH) {
      return jsonError('The subject or message is too long.', 400);
    }

    // Apply rate limiting after basic validation.
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          error: 'You are sending messages too quickly. Please wait a minute.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        },
      );
    }

    const [sender, recipient] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          full_name: true,
          role: true,
          council_role: true,
          council_active: true,
        },
      }),
      prisma.profile.findUnique({
        where: { id: recipientId },
        select: {
          id: true,
          role: true,
          council_role: true,
          council_active: true,
        },
      }),
    ]);

    if (!sender || !sender.council_active) {
      return jsonError('Your account is not currently active.', 403);
    }

    if (!recipient || !recipient.council_active) {
      return jsonError('The selected recipient is unavailable.', 404);
    }

    // Council accounts must use one of the authorized council roles.
    if (
      sender.role === 'council' &&
      !COUNCIL_ROLES.includes(sender.council_role || '')
    ) {
      return jsonError('Your council account is not authorized to message.', 403);
    }

    if (
      recipient.role === 'council' &&
      !COUNCIL_ROLES.includes(recipient.council_role || '')
    ) {
      return jsonError(
        'This recipient is not an authorized council member.',
        403,
      );
    }

    // Create the message and its in-app notification together.
    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          sender_id: sender.id,
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
          attachments: {
            select: {
              id: true,
              file_name: true,
              file_url: true,
              mime_type: true,
              file_size: true,
              created_at: true,
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          user_id: recipient.id,
          title: 'New message',
          message: `${sender.full_name} sent you a message: ${subject}`,
          type: 'MESSAGE',
          link: '/portal?tab=messages',
        },
      });

      return message;
    });

    // Audit logging should not make a successfully sent message appear to fail.
    try {
      await addAudit(
        user.id,
        sender.full_name,
        `Sent an in-app message to ${recipient.id}.`,
      );
    } catch (auditError) {
      console.error('Message audit logging failed:', auditError);
    }

    return NextResponse.json(
      {
        message: serializeMessage(result),
        notificationCreated: true,
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (error) {
    console.error('POST /api/messages failed:', error);

    return jsonError('Unable to send your message.', 500);
  }
}

