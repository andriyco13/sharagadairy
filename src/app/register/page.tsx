export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import RegisterClient, { GroupItem } from './RegisterClient';

export default async function RegisterPage() {
  let initialGroups: GroupItem[] = [];

  try {
    initialGroups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { users: true, schedules: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to load groups on server for /register:', error);
  }

  return <RegisterClient initialGroups={initialGroups} />;
}
