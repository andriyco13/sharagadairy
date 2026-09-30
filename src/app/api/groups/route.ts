import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { users: true, schedules: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      {
        success: true,
        groups,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching groups in /api/groups:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Не вдалося завантажити список груп з бази даних',
        groups: [],
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  }
}
