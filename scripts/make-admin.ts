import { prisma } from '../src/lib/prisma';

async function makeAdmin() {
  const emailArg = process.argv[2]?.trim().toLowerCase();

  let targetUser = null;

  if (emailArg) {
    targetUser = await prisma.user.findUnique({
      where: { email: emailArg },
    });

    if (!targetUser) {
      console.error(`Користувача з email "${emailArg}" не знайдено.`);
      process.exit(1);
    }
  } else {
    // Find owner or non-demo user
    targetUser = await prisma.user.findFirst({
      where: {
        email: { not: 'student@sharaga.ua' },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!targetUser) {
      console.error('Не знайдено підходящого користувача для призначення адміном.');
      process.exit(1);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: { role: 'ADMIN' },
  });

  console.log('--- УСПІШНО ПРИЗНАЧЕНО АДМІНІСТРАТОРА ---');
  console.log(`ID: ${updatedUser.id}`);
  console.log(`Ім'я: ${updatedUser.name}`);
  console.log(`Email: ${updatedUser.email}`);
  console.log(`Роль: ${updatedUser.role}`);
}

makeAdmin()
  .catch((err) => {
    console.error('Помилка при призначенні адміна:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
