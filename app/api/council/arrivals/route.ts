import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

const profileSelect = { id: true, full_name: true, email: true, matric_no: true } as const;

export async function GET(request: Request) {
   const user = await getAuth();
   if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
   if (user.role !== 'council' || user.councilRole !== 'welfare') {
      return NextResponse.json({ error: 'Only Welfare can view delivery history.' }, { status: 403 });
   }

   const params = new URL(request.url).searchParams;
   const date = params.get('date') || '';
   const status = params.get('status') || 'all';
   const parsedDate = new Date(`${date}T00:00:00.000Z`);
   if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return NextResponse.json({ error: 'Choose a valid registration date.' }, { status: 400 });
   }
   const start = new Date(`${date}T00:00:00.000+01:00`);
   if (!['all', 'delivered', 'not-delivered'].includes(status)) {
      return NextResponse.json({ error: 'Choose a valid delivery status.' }, { status: 400 });
   }

   const end = new Date(start);
   end.setUTCDate(end.getUTCDate() + 1);
   try {
      const arrivals = await prisma.arrivalRequest.findMany({
         where: {
            created_at: { gte: start, lt: end },
            ...(status === 'delivered' ? { status: 'DELIVERED' } : {}),
            ...(status === 'not-delivered' ? { status: { not: 'DELIVERED' } } : {}),
         },
         include: { student: { select: profileSelect } },
         orderBy: { created_at: 'desc' },
      });
      return NextResponse.json({ arrivals });
   } catch (error) {
      console.error('Delivery history query:', error);
      return NextResponse.json({ error: 'Could not load delivery history.' }, { status: 500 });
   }
}