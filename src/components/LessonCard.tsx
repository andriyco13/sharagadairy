'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  MapPin,
  User,
  Check,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  Calendar,
  Pencil,
  FlaskConical,
  GraduationCap,
} from 'lucide-react';
import {
  createTaskAction,
  toggleTaskAction,
  deleteTaskAction,
  deleteScheduleLessonAction,
} from '@/app/actions';
import { isSameCalendarDay, formatDateUk, toDateKey } from '@/lib/dateUtils';

export type UserTaskItem = {
  id: string;
  userId: string;
  scheduleId: string;
  content: string;
  isCompleted: boolean;
  dueDate: Date | string | null;
};

export type ScheduleItem = {
  id: string;
  groupId: string;
  subjectId: string;
  dayOfWeek: number;
  weekType: 'ALL' | 'EVEN' | 'ODD';
  lessonOrder: number;
  lessonType?: 'LECTURE' | 'PRACTICE';
  startTime: string;
  endTime: string;
  room: string;
  teacher: string | null;
  subject: {
    id: string;
    name: string;
    groupId: string;
    controlType?: 'EXAM' | 'CREDIT';
    lecturer?: string | null;
    practitioner?: string | null;
  };
  userTasks: UserTaskItem[];
};

interface LessonCardProps {
  schedule: ScheduleItem;
  activeDate: Date;
  isToday: boolean;
  isAdmin?: boolean;
  onEditLesson?: (schedule: ScheduleItem) => void;
}

export function LessonCard({
  schedule,
  activeDate,
  isToday,
  isAdmin = false,
  onEditLesson,
}: LessonCardProps) {
  const router = useRouter();
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);

  // All tasks for this schedule slot
  const [allTasks, setAllTasks] = useState<UserTaskItem[]>(schedule.userTasks || []);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);

  // Synchronize tasks when schedule prop updates from server
  const [prevScheduleTasks, setPrevScheduleTasks] = useState(schedule.userTasks);
  if (schedule.userTasks !== prevScheduleTasks) {
    setPrevScheduleTasks(schedule.userTasks);
    setAllTasks(schedule.userTasks || []);
  }

  // Filter tasks specific to active calendar date
  const displayedTasks = allTasks.filter((task) => {
    if (task.dueDate) {
      return isSameCalendarDay(task.dueDate, activeDate);
    }
    // If legacy task without dueDate, display it only on current/today view
    return isToday;
  });

  const handleToggle = (taskId: string, currentStatus: boolean) => {
    const updatedStatus = !currentStatus;
    // Optimistic update
    setAllTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted: updatedStatus } : t))
    );

    startTransition(async () => {
      const res = await toggleTaskAction(taskId, updatedStatus);
      if (!res.success) {
        // Revert on failure
        setAllTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, isCompleted: currentStatus } : t))
        );
      }
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newTaskContent.trim();
    if (!content || isAdding) return;

    setIsAdding(true);
    const tempId = 'temp-' + Date.now();
    const tempTask: UserTaskItem = {
      id: tempId,
      userId: 'current-user',
      scheduleId: schedule.id,
      content,
      isCompleted: false,
      dueDate: activeDate,
    };

    // Optimistic addition
    setAllTasks((prev) => [...prev, tempTask]);
    setNewTaskContent('');

    const res = await createTaskAction(schedule.id, content, toDateKey(activeDate));
    setIsAdding(false);

    if (res.success && res.task) {
      setAllTasks((prev) =>
        prev.map((t) => (t.id === tempId ? (res.task as UserTaskItem) : t))
      );
    } else {
      // Revert if failed
      setAllTasks((prev) => prev.filter((t) => t.id !== tempId));
      alert(res.error || 'Не вдалося додати завдання');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const target = allTasks.find((t) => t.id === taskId);
    if (!target) return;

    // Optimistic removal
    setAllTasks((prev) => prev.filter((t) => t.id !== taskId));

    startTransition(async () => {
      const res = await deleteTaskAction(taskId);
      if (!res.success) {
        // Revert
        setAllTasks((prev) => [...prev, target]);
      }
    });
  };

  const handleDeleteLesson = async () => {
    if (!confirm(`Видалити "${schedule.subject.name}" (${schedule.lessonOrder} пара) з розкладу вашої групи?`)) {
      return;
    }
    setIsDeletingLesson(true);
    const res = await deleteScheduleLessonAction(schedule.id);
    setIsDeletingLesson(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Не вдалося видалити пару з розкладу');
    }
  };

  const completedCount = displayedTasks.filter((t) => t.isCompleted).length;

  return (
    <div
      className={`group relative rounded-2xl border bg-white dark:bg-zinc-900/90 p-5 shadow-xs transition-all hover:shadow-md ${
        isToday
          ? 'border-indigo-300 dark:border-indigo-800/80 ring-1 ring-indigo-500/10'
          : 'border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Top row: Order, Time, Today Indicator, and Week Badge + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs">
            {schedule.lessonOrder} пара
          </span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {schedule.startTime} — {schedule.endTime}
            </span>
          </div>
          {/* Lesson Type Badge: Лекція чи Практика */}
          {schedule.lessonType === 'PRACTICE' ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Практика</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Лекція</span>
            </span>
          )}
          {isToday && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Сьогодні
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {schedule.weekType === 'ALL' && (
            <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Щотижня
            </span>
          )}
          {schedule.weekType === 'ODD' && (
            <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              Непарний (I)
            </span>
          )}
          {schedule.weekType === 'EVEN' && (
            <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
              Парний (II)
            </span>
          )}

          {/* Edit and Delete Buttons (ADMIN ONLY) */}
          {isAdmin && (
            <div className="flex items-center gap-1 pl-1.5 border-l border-zinc-200 dark:border-zinc-800">
              {onEditLesson && (
                <button
                  type="button"
                  onClick={() => onEditLesson(schedule)}
                  title="Редагувати параметри пари"
                  className="p-1 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleDeleteLesson}
                disabled={isDeletingLesson}
                title="Видалити пару з розкладу"
                className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeletingLesson ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subject Title and Teacher/Room */}
      <div className="mt-3.5 flex items-start gap-2.5">
        <div className="mt-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 p-1.5 text-indigo-600 dark:text-indigo-400">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {schedule.subject.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {schedule.room}
              </span>
            </div>
            {schedule.teacher && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-500 shrink-0" />
                <span>{schedule.teacher}</span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  ({schedule.lessonType === 'PRACTICE' ? 'практик' : 'лектор'})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Homework / UserTask Section */}
      <div className="mt-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 p-3.5 border border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Домашнє завдання на {formatDateUk(activeDate)}
            </span>
            {displayedTasks.length > 0 && (
              <span className="rounded-full bg-zinc-200/80 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                {completedCount}/{displayedTasks.length}
              </span>
            )}
          </div>
          {isPending && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
          )}
        </div>

        {/* Existing Tasks List for the date */}
        {displayedTasks.length > 0 ? (
          <ul className="space-y-1.5 mb-3">
            {displayedTasks.map((task) => (
              <li
                key={task.id}
                className="group/task flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-zinc-900 p-2 border border-zinc-200/60 dark:border-zinc-800/80 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => handleToggle(task.id, task.isCompleted)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                      task.isCompleted
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 bg-white dark:bg-zinc-800'
                    }`}
                    aria-label={task.isCompleted ? 'Позначити невиконаним' : 'Позначити виконаним'}
                  >
                    {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                  <span
                    className={`text-sm leading-snug transition-all ${
                      task.isCompleted
                        ? 'line-through text-zinc-400 dark:text-zinc-500'
                        : 'text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {task.content}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover/task:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Видалити завдання"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>На {formatDateUk(activeDate)} завдань ще немає. Додайте нове завдання нижче:</span>
          </p>
        )}

        {/* Quick Task Input Block */}
        <form onSubmit={handleCreateTask} className="flex items-center gap-2">
          <input
            type="text"
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            placeholder={`Нове ДЗ на ${formatDateUk(activeDate)}...`}
            disabled={isAdding}
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAdding || !newTaskContent.trim()}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-400 px-3 py-1.5 text-xs font-semibold text-white transition-colors shrink-0 shadow-xs"
          >
            {isAdding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Додати</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
