import { prisma } from '../src/lib/prisma';
import {
  registerAction,
  loginAction,
  demoLoginAction,
  getAvailableGroupsAction,
  saveNewGroupScheduleAction,
} from '../src/app/authActions';

async function runTests() {
  console.log('--- STARTING AUTH & ONBOARDING TESTS ---');

  // Test 1: Fetch groups
  const groupsRes = await getAvailableGroupsAction();
  console.log('Available groups count:', groupsRes.groups.length);
  if (groupsRes.groups.length === 0) {
    throw new Error('No groups found');
  }
  const existingGroup = groupsRes.groups[0];
  console.log(`Using existing group: ${existingGroup.name} (${existingGroup.id})`);

  // Test 2: Register user with existing group
  const testEmail1 = `student_test_${Date.now()}@test.com`;
  const reg1 = await registerAction({
    name: 'Іван Тестовий',
    email: testEmail1,
    password: 'securePassword123',
    groupChoice: 'existing',
    existingGroupId: existingGroup.id,
  });

  console.log('Registration 1 (existing group):', reg1);
  if (!reg1.success || reg1.isNewGroup) {
    throw new Error('Registration with existing group failed');
  }

  // Test 3: Register user with duplicate email -> should fail
  const regDup = await registerAction({
    name: 'Дублікат',
    email: testEmail1,
    password: 'securePassword123',
    groupChoice: 'existing',
    existingGroupId: existingGroup.id,
  });
  console.log('Duplicate email registration:', regDup);
  if (regDup.success) {
    throw new Error('Duplicate email registration should have failed');
  }

  // Test 4: Register user with NEW group
  const testEmail2 = `creator_${Date.now()}@test.com`;
  const newGroupName = `ІПЗ-99-${Date.now().toString().slice(-4)}`;
  const reg2 = await registerAction({
    name: 'Староста Групи',
    email: testEmail2,
    password: 'password123',
    groupChoice: 'new',
    newGroupName,
  });
  console.log('Registration 2 (new group):', reg2);
  if (!reg2.success || !reg2.isNewGroup || !reg2.groupId) {
    throw new Error('Registration with new group failed');
  }

  // Verify group in DB
  const createdGroup = await prisma.group.findUnique({
    where: { id: reg2.groupId },
  });
  console.log('Created group in DB:', createdGroup?.name);
  if (createdGroup?.name !== newGroupName) {
    throw new Error('Group name mismatch');
  }

  // Test 5: Save schedule for new group using saveNewGroupScheduleAction
  const user2 = await prisma.user.findUnique({ where: { email: testEmail2 } });
  const saveScheduleRes = await saveNewGroupScheduleAction(
    [
      {
        dayOfWeek: 1,
        lessonOrder: 1,
        startTime: '08:30',
        endTime: '10:05',
        subjectName: 'Веб-технології',
        weekType: 'ALL',
        room: 'ауд. 501',
        teacher: 'Петренко П. П.',
      },
      {
        dayOfWeek: 1,
        lessonOrder: 2,
        startTime: '10:20',
        endTime: '11:55',
        subjectName: 'Компʼютерна графіка',
        weekType: 'ODD',
        room: 'комп. клас 5',
        teacher: 'Василенко В. В.',
      },
      {
        dayOfWeek: 2,
        lessonOrder: 1,
        startTime: '08:30',
        endTime: '10:05',
        subjectName: 'Веб-технології',
        weekType: 'ALL',
        room: 'ауд. 501',
        teacher: 'Петренко П. П.',
      },
    ],
    user2?.id
  );
  console.log('Save schedule response:', saveScheduleRes);
  if (!saveScheduleRes.success || saveScheduleRes.count !== 3) {
    throw new Error('Failed to save schedule');
  }

  // Verify schedules in DB
  const schedulesInDb = await prisma.schedule.findMany({
    where: { groupId: reg2.groupId },
    include: { subject: true },
  });
  console.log(`Found ${schedulesInDb.length} schedules in DB for new group.`);
  if (schedulesInDb.length !== 3) {
    throw new Error('Schedule count mismatch');
  }

  // Test 6: Login with incorrect password
  const badLogin = await loginAction({
    email: testEmail1,
    password: 'wrong_password',
  });
  console.log('Bad login response:', badLogin);
  if (badLogin.success) {
    throw new Error('Bad login should have failed');
  }

  // Test 7: Login with correct password
  const goodLogin = await loginAction({
    email: testEmail1,
    password: 'securePassword123',
  });
  console.log('Good login response:', goodLogin);
  if (!goodLogin.success) {
    throw new Error('Good login failed');
  }

  // Test 8: Demo login
  const demoLogin = await demoLoginAction();
  console.log('Demo login response:', demoLogin);
  if (!demoLogin.success) {
    throw new Error('Demo login failed');
  }

  console.log('--- ALL AUTH TESTS PASSED SUCCESSFULLY! ---');
}

runTests()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
