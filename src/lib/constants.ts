/**
 * Bell schedule constants (1–8 pairs) and helper functions.
 */
export const BELL_SCHEDULE: Record<number, { startTime: string; endTime: string }> = {
  1: { startTime: '08:20', endTime: '09:40' },
  2: { startTime: '09:50', endTime: '11:10' },
  3: { startTime: '11:30', endTime: '12:50' },
  4: { startTime: '13:00', endTime: '14:20' },
  5: { startTime: '14:40', endTime: '16:00' },
  6: { startTime: '16:10', endTime: '17:30' },
  7: { startTime: '17:40', endTime: '19:00' },
  8: { startTime: '19:10', endTime: '20:30' },
};

export const LESSON_ORDERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function getBellSchedule(order: number): { startTime: string; endTime: string } {
  return BELL_SCHEDULE[order] || { startTime: '08:20', endTime: '09:40' };
}
