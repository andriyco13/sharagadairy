'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { toDateKey } from '@/lib/dateUtils';
import { ControlType, LessonType } from '@prisma/client';
import { BELL_SCHEDULE, getBellSchedule } from '@/lib/constants';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside of Next.js request context (e.g. testing scripts)
  }
}

/**
 * Creates a new task for the current student and given schedule, bound to a specific calendar dueDate
 */
export async function createTaskAction(
  scheduleId: string,
  content: string,
  dueDate?: string | Date | null
) {
  try {
    const trimmed = content.trim();
    if (!trimmed) {
      return { success: false, error: 'Текст завдання не може бути порожнім' };
    }

    // Retrieve authenticated student
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно увійти в систему' };
    }

    let parsedDueDate: Date | null = null;
    if (dueDate) {
      if (typeof dueDate === 'string') {
        const datePart = dueDate.includes('T') ? dueDate.split('T')[0] : dueDate;
        parsedDueDate = new Date(`${datePart}T12:00:00.000Z`);
      } else {
        parsedDueDate = dueDate;
      }
    }

    const newTask = await prisma.userTask.create({
      data: {
        userId: user.id,
        scheduleId,
        content: trimmed,
        isCompleted: false,
        dueDate: parsedDueDate,
      },
    });

    safeRevalidate('/');
    return { success: true, task: newTask };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: 'Не вдалося зберегти завдання' };
  }
}

/**
 * Toggles task completion state
 */
export async function toggleTaskAction(taskId: string, isCompleted: boolean) {
  try {
    const updated = await prisma.userTask.update({
      where: { id: taskId },
      data: { isCompleted },
    });

    safeRevalidate('/');
    return { success: true, task: updated };
  } catch (error) {
    console.error('Error toggling task:', error);
    return { success: false, error: 'Не вдалося оновити статус завдання' };
  }
}

/**
 * Deletes a task by ID
 */
export async function deleteTaskAction(taskId: string) {
  try {
    await prisma.userTask.delete({
      where: { id: taskId },
    });

    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: 'Не вдалося видалити завдання' };
  }
}

export interface SaveLessonGradeParams {
  subjectId: string;
  scheduleId?: string;
  score: number;
  maxScore?: number;
  date: string | Date;
}

/**
 * Saves or updates a student's grade for a specific lesson on a specific date.
 * Creates/updates an Assignment for the subject and upserts the UserGrade record.
 * This grade immediately reflects in the student's rating under "Успішність".
 */
export async function saveLessonGradeAction({
  subjectId,
  scheduleId,
  score,
  maxScore,
  date,
}: SaveLessonGradeParams) {
  try {
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0) {
      return { success: false, error: 'Введіть коректний бал (число від 0)' };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно увійти в систему' };
    }

    // Determine target date string and formatted date
    const dateKey = toDateKey(date);
    if (!dateKey) {
      return { success: false, error: 'Некоректна дата заняття' };
    }

    const parts = dateKey.split('-'); // [YYYY, MM, DD]
    const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`; // DD.MM.YYYY

    let lessonLabel = '';
    if (scheduleId) {
      const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
      if (schedule) {
        lessonLabel = ` (${schedule.lessonOrder} пара)`;
      }
    }

    const assignmentTitle = `Бал за заняття ${formattedDate}${lessonLabel}`;

    // Compute max score: if provided use it, otherwise max(5, score)
    const finalMaxScore = maxScore && maxScore > 0 ? Number(maxScore) : Math.max(5, Math.ceil(numScore));

    // Check if assignment already exists
    let assignment = await prisma.assignment.findFirst({
      where: {
        subjectId,
        title: assignmentTitle,
      },
    });

    if (assignment) {
      // Update maxScore and dueDate if needed
      assignment = await prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          maxScore: finalMaxScore,
          dueDate: new Date(`${dateKey}T12:00:00.000Z`),
        },
      });

      // Upsert UserGrade
      const grade = await prisma.userGrade.upsert({
        where: {
          userId_assignmentId: {
            userId: user.id,
            assignmentId: assignment.id,
          },
        },
        update: {
          score: numScore,
          earnedAt: new Date(),
        },
        create: {
          userId: user.id,
          assignmentId: assignment.id,
          score: numScore,
          earnedAt: new Date(),
        },
      });

      safeRevalidate('/');
      return {
        success: true,
        assignmentId: assignment.id,
        title: assignmentTitle,
        score: grade.score,
        maxScore: assignment.maxScore,
        dueDate: assignment.dueDate,
      };
    } else {
      // Create new Assignment and UserGrade
      assignment = await prisma.assignment.create({
        data: {
          subjectId,
          title: assignmentTitle,
          maxScore: finalMaxScore,
          dueDate: new Date(`${dateKey}T12:00:00.000Z`),
          userGrades: {
            create: {
              userId: user.id,
              score: numScore,
              earnedAt: new Date(),
            },
          },
        },
        include: {
          userGrades: true,
        },
      });

      safeRevalidate('/');
      return {
        success: true,
        assignmentId: assignment.id,
        title: assignmentTitle,
        score: numScore,
        maxScore: finalMaxScore,
        dueDate: assignment.dueDate,
      };
    }
  } catch (error) {
    console.error('Error saving lesson grade:', error);
    return { success: false, error: 'Не вдалося зберегти бал' };
  }
}

/**
 * Removes a student's grade for a specific lesson on a date
 */
export async function deleteLessonGradeAction(params: {
  subjectId: string;
  scheduleId?: string;
  date: string | Date;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно увійти в систему' };
    }

    const dateKey = toDateKey(params.date);
    if (!dateKey) {
      return { success: false, error: 'Некоректна дата заняття' };
    }

    const parts = dateKey.split('-');
    const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;

    let lessonLabel = '';
    if (params.scheduleId) {
      const schedule = await prisma.schedule.findUnique({ where: { id: params.scheduleId } });
      if (schedule) {
        lessonLabel = ` (${schedule.lessonOrder} пара)`;
      }
    }

    const assignmentTitle = `Бал за заняття ${formattedDate}${lessonLabel}`;

    const assignment = await prisma.assignment.findFirst({
      where: {
        subjectId: params.subjectId,
        title: assignmentTitle,
      },
    });

    if (assignment) {
      await prisma.userGrade.deleteMany({
        where: {
          userId: user.id,
          assignmentId: assignment.id,
        },
      });

      await prisma.assignment.delete({
        where: { id: assignment.id },
      });
    }

    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting lesson grade:', error);
    return { success: false, error: 'Не вдалося видалити бал' };
  }
}

export interface CreateAssignmentParams {
  subjectId: string;
  title: string;
  maxScore: number;
  dueDate?: string | Date | null;
  score?: number | null;
}

/**
 * Creates a new Assignment with optional dueDate and optional grade
 */
export async function createAssignmentAction({
  subjectId,
  title,
  maxScore,
  dueDate,
  score,
}: CreateAssignmentParams) {
  try {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { success: false, error: 'Назва роботи не може бути порожньою' };
    }

    const numMax = Number(maxScore);
    if (isNaN(numMax) || numMax <= 0) {
      return { success: false, error: 'Максимальний бал повинен бути більшим за 0' };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно увійти в систему' };
    }

    let parsedDueDate: Date | null = null;
    if (dueDate) {
      if (typeof dueDate === 'string') {
        const datePart = dueDate.includes('T') ? dueDate.split('T')[0] : dueDate;
        parsedDueDate = new Date(`${datePart}T12:00:00.000Z`);
      } else {
        parsedDueDate = dueDate;
      }
    }

    const hasGrade = score !== null && score !== undefined && !isNaN(Number(score));
    const numScore = hasGrade ? Number(score) : null;

    if (numScore !== null && (numScore < 0 || numScore > numMax)) {
      return { success: false, error: `Бал повинен бути від 0 до ${numMax}` };
    }

    const assignment = await prisma.assignment.create({
      data: {
        subjectId,
        title: trimmedTitle,
        maxScore: numMax,
        dueDate: parsedDueDate,
        userGrades:
          numScore !== null
            ? {
                create: {
                  userId: user.id,
                  score: numScore,
                  earnedAt: new Date(),
                },
              }
            : undefined,
      },
      include: {
        userGrades: {
          where: { userId: user.id },
        },
      },
    });

    safeRevalidate('/');
    return { success: true, assignment };
  } catch (error) {
    console.error('Error creating assignment:', error);
    return { success: false, error: 'Не вдалося створити роботу' };
  }
}

export interface UpdateAssignmentParams {
  assignmentId: string;
  title: string;
  maxScore: number;
  dueDate?: string | Date | null;
  score?: number | null;
}

/**
 * Updates an Assignment and upserts or removes its UserGrade
 */
export async function updateAssignmentAction({
  assignmentId,
  title,
  maxScore,
  dueDate,
  score,
}: UpdateAssignmentParams) {
  try {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { success: false, error: 'Назва роботи не може бути порожньою' };
    }

    const numMax = Number(maxScore);
    if (isNaN(numMax) || numMax <= 0) {
      return { success: false, error: 'Максимальний бал повинен бути більшим за 0' };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно увійти в систему' };
    }

    let parsedDueDate: Date | null = null;
    if (dueDate) {
      if (typeof dueDate === 'string') {
        const datePart = dueDate.includes('T') ? dueDate.split('T')[0] : dueDate;
        parsedDueDate = new Date(`${datePart}T12:00:00.000Z`);
      } else {
        parsedDueDate = dueDate;
      }
    }

    const hasGrade = score !== null && score !== undefined && !isNaN(Number(score));
    const numScore = hasGrade ? Number(score) : null;

    if (numScore !== null && (numScore < 0 || numScore > numMax)) {
      return { success: false, error: `Бал повинен бути від 0 до ${numMax}` };
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: trimmedTitle,
        maxScore: numMax,
        dueDate: parsedDueDate,
      },
    });

    if (numScore !== null) {
      await prisma.userGrade.upsert({
        where: {
          userId_assignmentId: {
            userId: user.id,
            assignmentId,
          },
        },
        update: {
          score: numScore,
          earnedAt: new Date(),
        },
        create: {
          userId: user.id,
          assignmentId,
          score: numScore,
          earnedAt: new Date(),
        },
      });
    } else if (score === null) {
      // Grade was removed
      await prisma.userGrade.deleteMany({
        where: {
          userId: user.id,
          assignmentId,
        },
      });
    }

    const updated = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        userGrades: {
          where: { userId: user.id },
        },
      },
    });

    safeRevalidate('/');
    return { success: true, assignment: updated };
  } catch (error) {
    console.error('Error updating assignment:', error);
    return { success: false, error: 'Не вдалося оновити роботу' };
  }
}

/**
 * Deletes an Assignment by ID
 */
export async function deleteAssignmentAction(assignmentId: string) {
  try {
    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return { success: false, error: 'Не вдалося видалити роботу' };
  }
}

/**
 * Updates a subject's control type ('EXAM' | 'CREDIT')
 */
export async function updateSubjectControlTypeAction(
  subjectId: string,
  controlType: 'EXAM' | 'CREDIT'
) {
  try {
    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: { controlType },
    });

    safeRevalidate('/');
    return { success: true, controlType: updated.controlType };
  } catch (error) {
    console.error('Error updating subject control type:', error);
    return { success: false, error: 'Не вдалося оновити тип контролю' };
  }
}

export interface CreateSubjectInput {
  name: string;
  controlType?: 'EXAM' | 'CREDIT';
  lecturer?: string | null;
  practitioner?: string | null;
}

/**
 * Creates a new subject for the student's group
 */
export async function createSubjectAction(input: CreateSubjectInput) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.groupId) {
      return { success: false, error: 'Необхідно увійти в систему з привʼязаною групою' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Вкажіть назву предмета' };
    }

    const existing = await prisma.subject.findFirst({
      where: {
        groupId: user.groupId,
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      return { success: false, error: 'Предмет з такою назвою вже існує в групі' };
    }

    const subject = await prisma.subject.create({
      data: {
        name: trimmedName,
        groupId: user.groupId,
        controlType: input.controlType === 'CREDIT' ? 'CREDIT' : 'EXAM',
        lecturer: input.lecturer?.trim() || null,
        practitioner: input.practitioner?.trim() || null,
      },
      include: {
        assignments: {
          include: {
            userGrades: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    safeRevalidate('/');
    return { success: true, subject };
  } catch (error) {
    console.error('Error creating subject:', error);
    return { success: false, error: 'Не вдалося створити предмет' };
  }
}

export interface UpdateSubjectInput {
  id: string;
  name: string;
  controlType?: 'EXAM' | 'CREDIT';
  lecturer?: string | null;
  practitioner?: string | null;
}

/**
 * Updates an existing subject
 */
export async function updateSubjectAction(input: UpdateSubjectInput) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.groupId) {
      return { success: false, error: 'Необхідно увійти в систему з привʼязаною групою' };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Вкажіть назву предмета' };
    }

    const existing = await prisma.subject.findUnique({
      where: { id: input.id },
    });

    if (!existing || existing.groupId !== user.groupId) {
      return { success: false, error: 'Предмет не знайдено або недостатньо прав' };
    }

    const updated = await prisma.subject.update({
      where: { id: input.id },
      data: {
        name: trimmedName,
        controlType: input.controlType === 'CREDIT' ? 'CREDIT' : 'EXAM',
        lecturer: input.lecturer?.trim() || null,
        practitioner: input.practitioner?.trim() || null,
      },
      include: {
        assignments: {
          include: {
            userGrades: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    safeRevalidate('/');
    return { success: true, subject: updated };
  } catch (error) {
    console.error('Error updating subject:', error);
    return { success: false, error: 'Не вдалося оновити предмет' };
  }
}

/**
 * Deletes a subject
 */
export async function deleteSubjectAction(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.groupId) {
      return { success: false, error: 'Необхідно увійти в систему з привʼязаною групою' };
    }

    const existing = await prisma.subject.findUnique({
      where: { id },
    });

    if (!existing || existing.groupId !== user.groupId) {
      return { success: false, error: 'Предмет не знайдено або недостатньо прав' };
    }

    await prisma.subject.delete({
      where: { id },
    });

    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting subject:', error);
    return { success: false, error: 'Не вдалося видалити предмет' };
  }
}

/**
 * Quick helper to populate demo classes for remaining days of the week if needed
 */
export async function seedDemoWeekAction() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.groupId) {
      return { success: false, error: 'Користувача не знайдено або група не призначена' };
    }

    const groupId = user.groupId;

    const subjects = await prisma.subject.findMany({ where: { groupId } });
    if (subjects.length === 0) return { success: false, error: 'Предмети не знайдено' };

    const math = subjects.find((s) => s.name.includes('математика')) || subjects[0];
    const prog = subjects.find((s) => s.name.includes('програмування')) || subjects[subjects.length - 1];

    // Check if Tuesday to Friday have schedules
    const existing = await prisma.schedule.findMany({
      where: {
        groupId,
        dayOfWeek: { in: [2, 3, 4, 5] },
      },
    });

    if (existing.length === 0) {
      await prisma.schedule.createMany({
        data: [
          // Вівторок (2)
          {
            groupId,
            subjectId: prog.id,
            dayOfWeek: 2,
            lessonOrder: 1,
            lessonType: 'PRACTICE',
            weekType: 'ALL',
            startTime: '08:20',
            endTime: '09:40',
            room: 'комп. клас 10',
            teacher: prog.practitioner || 'Сидоренко В. М.',
          },
          {
            groupId,
            subjectId: math.id,
            dayOfWeek: 2,
            lessonOrder: 2,
            lessonType: 'LECTURE',
            weekType: 'EVEN',
            startTime: '09:50',
            endTime: '11:10',
            room: 'ауд. 305',
            teacher: math.lecturer || 'Коваленко О. П.',
          },
          // Середа (3)
          {
            groupId,
            subjectId: math.id,
            dayOfWeek: 3,
            lessonOrder: 1,
            lessonType: 'PRACTICE',
            weekType: 'ALL',
            startTime: '08:20',
            endTime: '09:40',
            room: 'ауд. 210',
            teacher: math.practitioner || 'Коваленко О. П.',
          },
          {
            groupId,
            subjectId: prog.id,
            dayOfWeek: 3,
            lessonOrder: 2,
            lessonType: 'LECTURE',
            weekType: 'ODD',
            startTime: '09:50',
            endTime: '11:10',
            room: 'комп. клас 12',
            teacher: prog.lecturer || 'Сидоренко В. М.',
          },
          // Четвер (4)
          {
            groupId,
            subjectId: prog.id,
            dayOfWeek: 4,
            lessonOrder: 2,
            lessonType: 'PRACTICE',
            weekType: 'ALL',
            startTime: '09:50',
            endTime: '11:10',
            room: 'комп. клас 14',
            teacher: prog.practitioner || 'Сидоренко В. М.',
          },
          // П'ятниця (5)
          {
            groupId,
            subjectId: math.id,
            dayOfWeek: 5,
            lessonOrder: 1,
            lessonType: 'LECTURE',
            weekType: 'ALL',
            startTime: '08:20',
            endTime: '09:40',
            room: 'ауд. 401',
            teacher: math.lecturer || 'Коваленко О. П.',
          },
        ],
      });
    }

    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error seeding demo week:', error);
    return { success: false, error: 'Не вдалося створити демо-розклад' };
  }
}

export interface ScheduleItemInput {
  subjectId?: string;
  subjectName?: string;
  dayOfWeek: number;
  lessonOrder: number;
  lessonType?: 'LECTURE' | 'PRACTICE';
  startTime?: string;
  endTime?: string;
  weekType: 'ALL' | 'EVEN' | 'ODD';
  room: string;
  teacher?: string | null;
}

/**
 * Creates a single schedule lesson for the student's group
 */
export async function createScheduleItemAction(input: ScheduleItemInput) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.groupId) {
      return { success: false, error: 'Необхідно увійти в систему з привʼязаною групою' };
    }

    let subject = null;

    // 1. If subjectId provided, verify it
    if (input.subjectId) {
      subject = await prisma.subject.findFirst({
        where: {
          id: input.subjectId,
          groupId: user.groupId,
        },
      });
    }

    // 2. If not found by ID, use subjectName
    if (!subject && input.subjectName?.trim()) {
      const trimmedSubject = input.subjectName.trim();
      subject = await prisma.subject.findFirst({
        where: {
          groupId: user.groupId,
          name: { equals: trimmedSubject, mode: 'insensitive' },
        },
      });

      if (!subject) {
        subject = await prisma.subject.create({
          data: {
            name: trimmedSubject,
            groupId: user.groupId,
            controlType: 'EXAM',
          },
        });
      }
    }

    if (!subject) {
      return { success: false, error: 'Оберіть або вкажіть назву предмета' };
    }

    const bell = getBellSchedule(input.lessonOrder);
    const lessonType: LessonType = input.lessonType === 'PRACTICE' ? 'PRACTICE' : 'LECTURE';

    // Auto-detect teacher if not provided
    const fallbackTeacher =
      lessonType === 'PRACTICE'
        ? subject.practitioner || subject.lecturer
        : subject.lecturer || subject.practitioner;
    const finalTeacher = input.teacher?.trim() || fallbackTeacher || null;

    const newSchedule = await prisma.schedule.create({
      data: {
        groupId: user.groupId,
        subjectId: subject.id,
        dayOfWeek: input.dayOfWeek,
        lessonOrder: input.lessonOrder,
        lessonType,
        weekType: input.weekType,
        startTime: input.startTime?.trim() || bell.startTime,
        endTime: input.endTime?.trim() || bell.endTime,
        room: input.room?.trim() || 'дистанційно',
        teacher: finalTeacher,
      },
      include: {
        subject: true,
        userTasks: true,
      },
    });

    safeRevalidate('/');
    return { success: true, schedule: newSchedule };
  } catch (error) {
    console.error('Error creating schedule item:', error);
    return { success: false, error: 'Не вдалося додати пару до розкладу' };
  }
}

/**
 * Updates an existing schedule lesson
 */
export async function updateScheduleItemAction(id: string, input: ScheduleItemInput) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.groupId) {
      return { success: false, error: 'Необхідно увійти в систему з привʼязаною групою' };
    }

    const existing = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!existing || existing.groupId !== user.groupId) {
      return { success: false, error: 'Пару не знайдено або недостатньо прав' };
    }

    let subject = null;

    if (input.subjectId) {
      subject = await prisma.subject.findFirst({
        where: {
          id: input.subjectId,
          groupId: user.groupId,
        },
      });
    }

    if (!subject && input.subjectName?.trim()) {
      const trimmedSubject = input.subjectName.trim();
      subject = await prisma.subject.findFirst({
        where: {
          groupId: user.groupId,
          name: { equals: trimmedSubject, mode: 'insensitive' },
        },
      });

      if (!subject) {
        subject = await prisma.subject.create({
          data: {
            name: trimmedSubject,
            groupId: user.groupId,
            controlType: 'EXAM',
          },
        });
      }
    }

    if (!subject) {
      return { success: false, error: 'Оберіть або вкажіть назву предмета' };
    }

    const bell = getBellSchedule(input.lessonOrder);
    const lessonType: LessonType = input.lessonType === 'PRACTICE' ? 'PRACTICE' : 'LECTURE';

    const fallbackTeacher =
      lessonType === 'PRACTICE'
        ? subject.practitioner || subject.lecturer
        : subject.lecturer || subject.practitioner;
    const finalTeacher =
      input.teacher !== undefined ? input.teacher?.trim() || null : fallbackTeacher || null;

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        subjectId: subject.id,
        dayOfWeek: input.dayOfWeek,
        lessonOrder: input.lessonOrder,
        lessonType,
        weekType: input.weekType,
        startTime: input.startTime?.trim() || bell.startTime,
        endTime: input.endTime?.trim() || bell.endTime,
        room: input.room?.trim() || 'дистанційно',
        teacher: finalTeacher,
      },
      include: {
        subject: true,
        userTasks: true,
      },
    });

    safeRevalidate('/');
    return { success: true, schedule: updated };
  } catch (error) {
    console.error('Error updating schedule item:', error);
    return { success: false, error: 'Не вдалося оновити пару' };
  }
}

/**
 * Deletes a schedule lesson
 */
export async function deleteScheduleLessonAction(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.groupId) {
      return { success: false, error: 'Необхідно увійти в систему з привʼязаною групою' };
    }

    const existing = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!existing || existing.groupId !== user.groupId) {
      return { success: false, error: 'Пару не знайдено або недостатньо прав' };
    }

    await prisma.schedule.delete({
      where: { id },
    });

    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting schedule item:', error);
    return { success: false, error: 'Не вдалося видалити пару з розкладу' };
  }
}

/**
 * Replaces/saves full weekly schedule for current group
 */
export async function saveGroupWeeklyScheduleAction(lessons: ScheduleItemInput[]) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.groupId) {
      return { success: false, error: 'Необхідно увійти в систему з привʼязаною групою' };
    }

    const groupId = user.groupId;

    const validLessons = lessons.filter(
      (l) =>
        (l.subjectId || l.subjectName?.trim()) &&
        l.dayOfWeek >= 1 &&
        l.dayOfWeek <= 7 &&
        l.lessonOrder >= 1
    );

    // Delete existing schedules for this group
    await prisma.schedule.deleteMany({
      where: { groupId },
    });

    if (validLessons.length === 0) {
      safeRevalidate('/');
      return { success: true, count: 0 };
    }

    const uniqueSubjectNames = Array.from(
      new Set(
        validLessons
          .filter((l) => !l.subjectId && l.subjectName?.trim())
          .map((l) => l.subjectName!.trim())
      )
    );

    const subjectMap = new Map<string, string>();
    const existingSubjects = await prisma.subject.findMany({
      where: { groupId },
    });

    for (const s of existingSubjects) {
      subjectMap.set(s.name.toLowerCase(), s.id);
      subjectMap.set(s.id, s.id);
    }

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

    const scheduleData = validLessons.map((l) => {
      const subjectId = l.subjectId || subjectMap.get(l.subjectName!.trim().toLowerCase())!;
      const bell = getBellSchedule(l.lessonOrder);
      return {
        groupId,
        subjectId,
        dayOfWeek: l.dayOfWeek,
        lessonOrder: l.lessonOrder,
        lessonType: (l.lessonType === 'PRACTICE' ? 'PRACTICE' : 'LECTURE') as LessonType,
        weekType: l.weekType,
        startTime: l.startTime?.trim() || bell.startTime,
        endTime: l.endTime?.trim() || bell.endTime,
        room: l.room?.trim() || 'дистанційно',
        teacher: l.teacher?.trim() || null,
      };
    });

    await prisma.schedule.createMany({
      data: scheduleData,
    });

    safeRevalidate('/');
    return { success: true, count: scheduleData.length };
  } catch (error) {
    console.error('Error saving full group schedule:', error);
    return { success: false, error: 'Не вдалося зберегти розклад' };
  }
}


