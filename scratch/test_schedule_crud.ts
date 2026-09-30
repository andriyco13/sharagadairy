import { prisma } from '../src/lib/prisma';
import {
  createScheduleItemAction,
  updateScheduleItemAction,
  deleteScheduleLessonAction,
} from '../src/app/actions';

async function runTest() {
  console.log('Testing Schedule CRUD actions...');

  // 1. Find demo user
  const user = await prisma.user.findUnique({
    where: { email: 'student@sharaga.ua' },
  });

  if (!user || !user.groupId) {
    throw new Error('User or groupId not found');
  }

  const testToken = 'test-token-schedule-crud-' + Date.now();
  await prisma.session.create({
    data: {
      userId: user.id,
      token: testToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });

  console.log('User ID:', user.id, 'Group ID:', user.groupId);

  // 2. Test createScheduleItemAction
  const createRes = await createScheduleItemAction({
    dayOfWeek: 2, // Tuesday
    lessonOrder: 4,
    startTime: '14:00',
    endTime: '15:35',
    subjectName: 'Тестова Дисципліна',
    weekType: 'ALL',
    room: 'ауд. 999',
    teacher: 'Тестовий В. В.',
  });

  console.log('Create result:', createRes);
  if (!createRes.success || !createRes.schedule) {
    throw new Error('Failed to create schedule item: ' + createRes.error);
  }

  const createdId = createRes.schedule.id;

  // 3. Test updateScheduleItemAction
  const updateRes = await updateScheduleItemAction(createdId, {
    dayOfWeek: 2,
    lessonOrder: 4,
    startTime: '14:00',
    endTime: '15:35',
    subjectName: 'Оновлена Дисципліна',
    weekType: 'ODD',
    room: 'ауд. 777',
    teacher: 'Оновлений О. О.',
  });

  console.log('Update result:', updateRes);
  if (!updateRes.success || !updateRes.schedule) {
    throw new Error('Failed to update schedule item: ' + updateRes.error);
  }

  if (updateRes.schedule.room !== 'ауд. 777' || updateRes.schedule.weekType !== 'ODD') {
    throw new Error('Updated fields do not match');
  }

  // 4. Test deleteScheduleLessonAction
  const deleteRes = await deleteScheduleLessonAction(createdId);
  console.log('Delete result:', deleteRes);
  if (!deleteRes.success) {
    throw new Error('Failed to delete schedule item: ' + deleteRes.error);
  }

  // Verify deletion in DB
  const check = await prisma.schedule.findUnique({
    where: { id: createdId },
  });
  if (check !== null) {
    throw new Error('Schedule item still exists in DB');
  }

  // Clean up session
  await prisma.session.delete({
    where: { token: 'test-token-schedule-crud' },
  });

  console.log('All Schedule CRUD tests passed successfully! ✅');
}

runTest()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
