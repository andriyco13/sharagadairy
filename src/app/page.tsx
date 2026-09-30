import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ScheduleView } from '@/components/ScheduleView';
import { sortAssignmentsByDate } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 1. Fetch authenticated student session
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Fetch all schedules for this user's group with subjects and student's tasks
  const schedules = user.groupId
    ? await prisma.schedule.findMany({
        where: { groupId: user.groupId },
        include: {
          subject: true,
          userTasks: {
            where: { userId: user.id },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { lessonOrder: 'asc' },
        ],
      })
    : [];

  // 3. Fetch subjects with assignments and user grades for 'Успішність' tab
  const rawSubjects = user.groupId
    ? await prisma.subject.findMany({
        where: { groupId: user.groupId },
        include: {
          assignments: {
            include: {
              userGrades: {
                where: { userId: user.id },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      })
    : [];

  // Chronologically sort assignments by date
  const subjects = rawSubjects.map((subject) => ({
    ...subject,
    assignments: sortAssignmentsByDate(subject.assignments),
  }));

  return (
    <ScheduleView
      user={user}
      schedules={schedules}
      subjects={subjects}
    />
  );
}
