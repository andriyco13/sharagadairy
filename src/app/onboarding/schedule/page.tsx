import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ScheduleWizard } from './ScheduleWizard';

export const dynamic = 'force-dynamic';

export default async function OnboardingSchedulePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.groupId) {
    redirect('/');
  }

  const existingSchedules = await prisma.schedule.findMany({
    where: { groupId: user.groupId },
    include: { subject: true },
    orderBy: [{ dayOfWeek: 'asc' }, { lessonOrder: 'asc' }],
  });

  const initialLessons = existingSchedules.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    lessonOrder: s.lessonOrder,
    startTime: s.startTime,
    endTime: s.endTime,
    subjectName: s.subject.name,
    weekType: s.weekType,
    room: s.room,
    teacher: s.teacher || undefined,
  }));

  return (
    <ScheduleWizard
      userName={user.name}
      groupName={user.group?.name || 'Група'}
      initialLessons={initialLessons}
      isEditingExisting={existingSchedules.length > 0}
    />
  );
}
