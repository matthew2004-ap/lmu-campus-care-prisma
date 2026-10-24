import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET() {
  const config = { databaseUrl: Boolean(process.env.DATABASE_URL), authSecret: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32), googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) };
  try { await prisma.$queryRaw`SELECT 1`; return NextResponse.json({ ok: true, database: 'connected', config }); }
  catch { return NextResponse.json({ ok: false, database: 'unavailable', config, message: 'Database connection failed. Check DATABASE_URL and PostgreSQL availability.' }, { status: 503 }); }
}
