import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminDashboard } from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }

  // 1. Fetch all groups with entity counts
  const groups = await prisma.group.findMany({
    include: {
      _count: {
        select: {
          users: true,
          subjects: true,
          schedules: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // 2. Fetch all subjects across all groups
  const subjects = await prisma.subject.findMany({
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          assignments: true,
          schedules: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // 3. Fetch all schedule entries across all groups
  const schedules = await prisma.schedule.findMany({
    include: {
      subject: true,
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { dayOfWeek: 'asc' },
      { lessonOrder: 'asc' },
    ],
  });

  // 4. Fetch all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      groupId: true,
      notifyTelegram: true,
      telegramChatId: true,
      createdAt: true,
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { name: 'asc' },
    ],
  });

  return (
    <AdminDashboard
      initialGroups={groups}
      initialSubjects={subjects}
      initialSchedules={schedules}
      initialUsers={users}
      currentAdminUser={user}
    />
  );
}
