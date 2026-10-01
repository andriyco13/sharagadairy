import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/auth';

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

export async function POST(req: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const name = body?.name?.trim();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Введіть коректну назву групи (мінімум 2 символи)' },
        { status: 400 }
      );
    }

    const existing = await prisma.group.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Група з такою назвою вже існує' },
        { status: 400 }
      );
    }

    const group = await prisma.group.create({
      data: { name },
    });

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    console.error('Error creating group in /api/groups:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні групи' },
      { status: 500 }
    );
  }
}

