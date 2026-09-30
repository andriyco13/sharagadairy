'use server';

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, createSession, destroySession, getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { WeekType, LessonType } from '@prisma/client';
import { getBellSchedule } from '@/lib/constants';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside of Next.js request context (e.g. testing scripts)
  }
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

export async function loginAction(formData: { email: string; password: string }): Promise<LoginResult> {
  try {
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!email || !password) {
      return { success: false, error: 'Будь ласка, введіть email та пароль' };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return { success: false, error: 'Невірний email або пароль' };
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return { success: false, error: 'Невірний email або пароль' };
    }

    await createSession(user.id);
    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: 'Помилка входу. Спробуйте пізніше.' };
  }
}

export async function demoLoginAction(): Promise<LoginResult> {
  try {
    const demoUser = await prisma.user.findUnique({
      where: { email: 'student@sharaga.ua' },
    });

    if (!demoUser) {
      return { success: false, error: 'Демо-користувача не знайдено в базі' };
    }

    await createSession(demoUser.id);
    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error in demo login:', error);
    return { success: false, error: 'Помилка тестового входу' };
  }
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  groupChoice: 'existing' | 'new';
  existingGroupId?: string;
  newGroupName?: string;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
  isNewGroup?: boolean;
  groupId?: string;
}

export async function registerAction(data: RegisterParams): Promise<RegisterResult> {
  try {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;

    if (!name || name.length < 2) {
      return { success: false, error: "Введіть коректне ім'я (мінімум 2 символи)" };
    }

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Введіть коректну адресу електронної пошти' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Пароль повинен містити щонайменше 6 символів' };
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'Користувач із такою електронною поштою вже зареєстрований' };
    }

    let finalGroupId: string | null = null;
    let isNewGroup = false;

    if (data.groupChoice === 'existing') {
      if (!data.existingGroupId) {
        return { success: false, error: 'Будь ласка, оберіть вашу навчальну групу' };
      }
      const existingGroup = await prisma.group.findUnique({
        where: { id: data.existingGroupId },
      });
      if (!existingGroup) {
        return { success: false, error: 'Обрану групу не знайдено' };
      }
      finalGroupId = existingGroup.id;
    } else {
      const groupName = (data.newGroupName || '').trim();
      if (!groupName || groupName.length < 2) {
        return { success: false, error: 'Введіть назву нової групи (наприклад: "ІПЗ-22")' };
      }

      // Check if group already exists with this name (case-insensitive find or create)
      let group = await prisma.group.findFirst({
        where: { name: { equals: groupName, mode: 'insensitive' } },
      });

      if (!group) {
        group = await prisma.group.create({
          data: { name: groupName },
        });
        isNewGroup = true;
      }
      finalGroupId = group.id;
    }

    // Hash password & create user
    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        groupId: finalGroupId,
      },
    });

    await createSession(newUser.id);
    safeRevalidate('/');
    safeRevalidate('/register');

    return {
      success: true,
      isNewGroup,
      groupId: finalGroupId || undefined,
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error: 'Помилка реєстрації. Спробуйте ще раз.' };
  }
}

export async function logoutAction() {
  await destroySession();
  safeRevalidate('/');
  return { success: true };
}

export async function getAvailableGroupsAction() {
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
    return { success: true, groups };
  } catch (error) {
    console.error('Error fetching groups:', error);
    return { success: false, groups: [], error: 'Не вдалося завантажити список груп' };
  }
}

export interface LessonScheduleInput {
  dayOfWeek: number;
  lessonOrder: number;
  lessonType?: 'LECTURE' | 'PRACTICE';
  startTime?: string;
  endTime?: string;
  subjectName: string;
  weekType: 'ALL' | 'EVEN' | 'ODD';
  room: string;
  teacher?: string;
}

export async function saveNewGroupScheduleAction(
  lessons: LessonScheduleInput[],
  userIdOverride?: string
) {
  try {
    const user = await getCurrentUser(userIdOverride);
    if (!user || !user.groupId) {
      return { success: false, error: 'Користувач не авторизований або не має привʼязаної групи' };
    }

    const groupId = user.groupId;

    // Filter out invalid lessons
    const validLessons = lessons.filter(
      (l) => l.subjectName.trim() && l.dayOfWeek >= 1 && l.dayOfWeek <= 7 && l.lessonOrder >= 1
    );

    if (validLessons.length === 0) {
      return { success: false, error: 'Додайте хоча б одне заняття до розкладу' };
    }

    // Find or create subjects in this group
    const uniqueSubjectNames = Array.from(
      new Set(validLessons.map((l) => l.subjectName.trim()))
    );

    const subjectMap = new Map<string, string>(); // name.toLowerCase() -> subjectId

    // Fetch existing subjects for this group
    const existingSubjects = await prisma.subject.findMany({
      where: { groupId },
    });

    for (const s of existingSubjects) {
      subjectMap.set(s.name.toLowerCase(), s.id);
    }

    // Create subjects that don't exist yet
    for (const sName of uniqueSubjectNames) {
      if (!subjectMap.has(sName.toLowerCase())) {
        const created = await prisma.subject.create({
          data: {
            name: sName,
            groupId,
            controlType: 'EXAM',
          },
        });
        subjectMap.set(sName.toLowerCase(), created.id);
      }
    }

    // Create schedule items
    const scheduleData = validLessons.map((l) => {
      const subjectId = subjectMap.get(l.subjectName.trim().toLowerCase())!;
      const bell = getBellSchedule(l.lessonOrder);
      return {
        groupId,
        subjectId,
        dayOfWeek: l.dayOfWeek,
        lessonOrder: l.lessonOrder,
        lessonType: (l.lessonType === 'PRACTICE' ? 'PRACTICE' : 'LECTURE') as LessonType,
        weekType: l.weekType as WeekType,
        startTime: l.startTime?.trim() || bell.startTime,
        endTime: l.endTime?.trim() || bell.endTime,
        room: l.room.trim() || 'дистанційно',
        teacher: l.teacher?.trim() || null,
      };
    });

    await prisma.schedule.createMany({
      data: scheduleData,
    });

    safeRevalidate('/');
    safeRevalidate('/register');
    return { success: true, count: scheduleData.length };
  } catch (error) {
    console.error('Error saving new group schedule:', error);
    return { success: false, error: 'Не вдалося зберегти розклад' };
  }
}

