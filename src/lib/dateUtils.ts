/**
 * Utility functions for semester week calculation, dates, and Ukrainian formatting.
 */

/**
 * Returns the academic year start date (September 1st) for a given reference date.
 * If the reference date is in Jan-Aug (months 0-7), the academic year began Sept 1st of the previous calendar year.
 * If the reference date is in Sep-Dec (months 8-11), the academic year began Sept 1st of the current calendar year.
 */
export function getAcademicYearStart(referenceDate: Date = new Date()): Date {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0 = Jan, 8 = Sep
  const startYear = month >= 8 ? year : year - 1;
  return new Date(startYear, 8, 1, 0, 0, 0, 0);
}

/**
 * Returns the Monday of the week containing the given date at 00:00:00 local time.
 */
export function getMondayOfDate(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = date.getDate() - (day === 0 ? 6 : day - 1);
  return new Date(date.getFullYear(), date.getMonth(), diff, 0, 0, 0, 0);
}

/**
 * Calculates the week number (1-based) and parity ('ODD' | 'EVEN')
 * relative to the semester start date (default September 1st of current academic year).
 */
export function getWeekNumberAndType(
  targetDate: Date = new Date(),
  semesterStart: Date = getAcademicYearStart(targetDate)
): { weekNumber: number; weekType: 'ODD' | 'EVEN'; weekMonday: Date } {
  const targetMonday = getMondayOfDate(targetDate);
  const startMonday = getMondayOfDate(semesterStart);

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  // Round to handle Daylight Saving Time (DST) shifts
  const diffWeeks = Math.round((targetMonday.getTime() - startMonday.getTime()) / msPerWeek);
  const weekNumber = diffWeeks + 1; // 1-indexed

  // Check if weekNumber is odd or even
  const isOdd = Math.abs(weekNumber) % 2 === 1;
  const weekType: 'ODD' | 'EVEN' = isOdd ? 'ODD' : 'EVEN';

  return { weekNumber, weekType, weekMonday: targetMonday };
}

/**
 * Returns the Date for a specific day of week (1 = Mon ... 5 = Fri)
 * for a given week Monday.
 */
export function getDateForDayOfWeek(weekMonday: Date, dayOfWeek: number): Date {
  return new Date(
    weekMonday.getFullYear(),
    weekMonday.getMonth(),
    weekMonday.getDate() + (dayOfWeek - 1),
    0, 0, 0, 0
  );
}

/**
 * Formats date into 'YYYY-MM-DD' key for consistent date comparison.
 */
export function toDateKey(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compares two dates to see if they are the exact same calendar day.
 */
export function isSameCalendarDay(
  d1: Date | string | null | undefined,
  d2: Date | string | null | undefined
): boolean {
  const key1 = toDateKey(d1);
  const key2 = toDateKey(d2);
  if (!key1 || !key2) return false;
  return key1 === key2;
}

/**
 * Human-readable date string in Ukrainian, e.g. "28 вересня 2026" or "28 вересня".
 */
export function formatDateUk(d: Date | string, includeYear: boolean = false): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const months = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  return includeYear ? `${day} ${month} ${date.getFullYear()}` : `${day} ${month}`;
}

/**
 * Format date range for week header, e.g. "28 вер. — 02 жовт. 2026".
 */
export function formatWeekRangeUk(weekMonday: Date): string {
  const friday = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + 4);
  const shortMonths = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.'];

  const m1 = shortMonths[weekMonday.getMonth()];
  const m2 = shortMonths[friday.getMonth()];

  if (weekMonday.getMonth() === friday.getMonth()) {
    return `${weekMonday.getDate()} — ${friday.getDate()} ${m2} ${friday.getFullYear()}`;
  }
  return `${weekMonday.getDate()} ${m1} — ${friday.getDate()} ${m2} ${friday.getFullYear()}`;
}

/**
 * Searches assignments of a subject for a grade matching a specific lesson and calendar date.
 */
export function findLessonGrade(
  assignments:
    | {
        id: string;
        title: string;
        maxScore: number;
        userGrades: { id: string; score: number; earnedAt: Date | string }[];
      }[]
    | undefined,
  date: Date | string,
  lessonOrder: number
): { assignmentId: string; title: string; score: number; maxScore: number } | null {
  if (!assignments) return null;
  const dateKey = toDateKey(date);
  if (!dateKey) return null;
  const parts = dateKey.split('-');
  const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`; // DD.MM.YYYY
  const targetPrefix = `Бал за заняття ${formattedDate}`;

  const assignment = assignments.find((a) => {
    return (
      (a.title.startsWith(targetPrefix) && a.title.includes(`${lessonOrder} пара`)) ||
      a.title === targetPrefix
    );
  });

  if (!assignment || assignment.userGrades.length === 0) return null;
  return {
    assignmentId: assignment.id,
    title: assignment.title,
    score: assignment.userGrades[0].score,
    maxScore: assignment.maxScore,
  };
}

export type DeadlineStatus = {
  label: string;
  badgeType: 'success' | 'warning' | 'danger' | 'neutral';
  dateFormatted: string;
};

/**
 * Calculates deadline proximity status for an assignment.
 */
export function getDeadlineStatus(
  dueDate: Date | string | null | undefined,
  hasGrade: boolean,
  currentDate: Date = new Date()
): DeadlineStatus | null {
  if (!dueDate) return null;
  const target = new Date(dueDate);
  if (isNaN(target.getTime())) return null;

  const targetDateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const todayOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((targetDateOnly.getTime() - todayOnly.getTime()) / msPerDay);

  const months = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.'];
  const dateFormatted = `${target.getDate()} ${months[target.getMonth()]}`;

  if (hasGrade) {
    return {
      label: dateFormatted,
      badgeType: 'success',
      dateFormatted,
    };
  }

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return {
      label: `Протерміновано на ${abs} ${abs === 1 ? 'день' : abs < 5 ? 'дні' : 'днів'}`,
      badgeType: 'danger',
      dateFormatted,
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Дедлайн сьогодні!',
      badgeType: 'warning',
      dateFormatted,
    };
  }

  if (diffDays === 1) {
    return {
      label: 'Дедлайн завтра',
      badgeType: 'warning',
      dateFormatted,
    };
  }

  if (diffDays <= 5) {
    return {
      label: `Дедлайн через ${diffDays} ${diffDays < 5 ? 'дні' : 'днів'}`,
      badgeType: 'warning',
      dateFormatted,
    };
  }

  return {
    label: dateFormatted,
    badgeType: 'neutral',
    dateFormatted,
  };
}

/**
 * Sorts assignments chronologically by dueDate (earliest first), placing items without dueDate at the end.
 */
export function sortAssignmentsByDate<
  T extends { dueDate?: Date | string | null; id?: string }
>(assignments: T[]): T[] {
  return [...assignments].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return (a.id || '').localeCompare(b.id || '');
  });
}
