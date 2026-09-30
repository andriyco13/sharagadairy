import { PrismaClient, WeekType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Очищення перед наповненням
  await prisma.session.deleteMany();
  await prisma.userGrade.deleteMany();
  await prisma.userTask.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();

  // 1. Створюємо групу
  const group = await prisma.group.create({
    data: {
      name: 'КН-21',
    },
  });

  // 2. Створюємо тестового студента
  const hashedPassword = await bcrypt.hash('student123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Студент',
      email: 'student@sharaga.ua',
      password: hashedPassword,
      groupId: group.id,
    },
  });

  // 3. Додаємо предмети
  const math = await prisma.subject.create({
    data: {
      name: 'Вища математика',
      groupId: group.id,
      controlType: 'EXAM',
      lecturer: 'Коваленко О. П.',
      practitioner: 'Бондаренко А. С.',
      assignments: {
        create: [
          { title: 'Лабораторна робота №1', maxScore: 7 },
          { title: 'Лабораторна робота №2', maxScore: 7 },
          { title: 'Модульна контрольна', maxScore: 20 },
        ],
      },
    },
  });

  const prog = await prisma.subject.create({
    data: {
      name: 'Веб-програмування',
      groupId: group.id,
      controlType: 'CREDIT',
      lecturer: 'Сидоренко В. М.',
      practitioner: 'Сидоренко В. М.',
      assignments: {
        create: [
          { title: 'Практична робота 1 (HTML/CSS)', maxScore: 10 },
          { title: 'Практична робота 2 (React)', maxScore: 15 },
        ],
      },
    },
  });

  // 4. Додаємо розклад на Понеділок (dayOfWeek = 1)
  const mathSchedule = await prisma.schedule.create({
    data: {
      groupId: group.id,
      subjectId: math.id,
      dayOfWeek: 1,
      lessonOrder: 1,
      lessonType: 'LECTURE',
      weekType: WeekType.ALL,
      startTime: '08:20',
      endTime: '09:40',
      room: 'ауд. 305',
      teacher: 'Коваленко О. П.',
    },
  });

  await prisma.schedule.create({
    data: {
      groupId: group.id,
      subjectId: prog.id,
      dayOfWeek: 1,
      lessonOrder: 2,
      lessonType: 'PRACTICE',
      weekType: WeekType.ODD, // непарний тиждень
      startTime: '09:50',
      endTime: '11:10',
      room: 'комп. клас 12',
      teacher: 'Сидоренко В. М.',
    },
  });

  // 5. Персональне ДЗ студента до пари математики з прив'язкою до поточного понеділка
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - (day === 0 ? 6 : day - 1);
  const currentMonday = new Date(today.getFullYear(), today.getMonth(), diff, 12, 0, 0);

  await prisma.userTask.create({
    data: {
      userId: user.id,
      scheduleId: mathSchedule.id,
      content: 'Розвʼязати інтеграли №4, 7 зі стор. 42',
      isCompleted: false,
      dueDate: currentMonday,
    },
  });

  // 6. Персональна оцінка за першу лабу (5 з 7)
  const mathAssignments = await prisma.assignment.findMany({ where: { subjectId: math.id } });
  await prisma.userGrade.create({
    data: {
      userId: user.id,
      assignmentId: mathAssignments[0].id,
      score: 5.0,
    },
  });

  console.log('✅ База успішно наповнена тестовими даними для групи КН-21!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
