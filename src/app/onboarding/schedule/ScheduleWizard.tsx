'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  Plus,
  Trash2,
  MapPin,
  User,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { LessonScheduleInput } from '@/app/authActions';
import { saveGroupWeeklyScheduleAction } from '@/app/actions';
import { BELL_SCHEDULE, getBellSchedule } from '@/lib/constants';

let lessonTempCounter = 100;
function generateTempId() {
  lessonTempCounter += 1;
  return `lesson-temp-${lessonTempCounter}`;
}

interface ScheduleWizardProps {
  userName: string;
  groupName: string;
  initialLessons?: LessonScheduleInput[];
  isEditingExisting?: boolean;
}

interface EditableLesson extends LessonScheduleInput {
  tempId: string;
  lessonType?: 'LECTURE' | 'PRACTICE';
}

const DAYS = [
  { id: 1, short: 'Пн', name: 'Понеділок' },
  { id: 2, short: 'Вт', name: 'Вівторок' },
  { id: 3, short: 'Ср', name: 'Середа' },
  { id: 4, short: 'Чт', name: 'Четвер' },
  { id: 5, short: 'Пт', name: "П'ятниця" },
];

export function ScheduleWizard({
  userName,
  groupName,
  initialLessons,
  isEditingExisting = false,
}: ScheduleWizardProps) {
  const router = useRouter();
  const [activeDay, setActiveDay] = useState<number>(1);
  const [lessons, setLessons] = useState<EditableLesson[]>(() => {
    if (initialLessons && initialLessons.length > 0) {
      return initialLessons.map((l, idx) => ({
        ...l,
        tempId: `init-${idx}-${l.dayOfWeek}-${l.lessonOrder}`,
      }));
    }
    return [
      {
        tempId: 'init-1',
        dayOfWeek: 1,
        lessonOrder: 1,
        lessonType: 'LECTURE',
        startTime: '08:20',
        endTime: '09:40',
        subjectName: '',
        weekType: 'ALL',
        room: 'ауд. 101',
        teacher: '',
      },
      {
        tempId: 'init-2',
        dayOfWeek: 1,
        lessonOrder: 2,
        lessonType: 'PRACTICE',
        startTime: '09:50',
        endTime: '11:10',
        subjectName: '',
        weekType: 'ALL',
        room: 'ауд. 102',
        teacher: '',
      },
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lessons for the active day
  const activeLessons = lessons
    .filter((l) => l.dayOfWeek === activeDay)
    .sort((a, b) => a.lessonOrder - b.lessonOrder);

  const handleAddLesson = () => {
    const nextOrder =
      activeLessons.length > 0 ? Math.max(...activeLessons.map((l) => l.lessonOrder)) + 1 : 1;
    const defaultBell = getBellSchedule(nextOrder);

    const newLesson: EditableLesson = {
      tempId: generateTempId(),
      dayOfWeek: activeDay,
      lessonOrder: nextOrder,
      lessonType: 'LECTURE',
      startTime: defaultBell.startTime,
      endTime: defaultBell.endTime,
      subjectName: '',
      weekType: 'ALL',
      room: 'ауд. 101',
      teacher: '',
    };

    setLessons((prev) => [...prev, newLesson]);
  };

  const handleUpdateLesson = (tempId: string, fields: Partial<EditableLesson>) => {
    setLessons((prev) =>
      prev.map((l) => {
        if (l.tempId !== tempId) return l;

        const updated = { ...l, ...fields };
        // If lessonOrder changed, automatically update default bell times
        if (fields.lessonOrder !== undefined && BELL_SCHEDULE[fields.lessonOrder]) {
          const bell = BELL_SCHEDULE[fields.lessonOrder];
          updated.startTime = bell.startTime;
          updated.endTime = bell.endTime;
        }
        return updated;
      })
    );
  };

  const handleDeleteLesson = (tempId: string) => {
    setLessons((prev) => prev.filter((l) => l.tempId !== tempId));
  };

  // Pre-fill demo template
  const handlePrefillTemplate = () => {
    const demoItems: EditableLesson[] = [
      // Понеділок
      {
        tempId: 'tpl-1',
        dayOfWeek: 1,
        lessonOrder: 1,
        lessonType: 'LECTURE',
        startTime: '08:20',
        endTime: '09:40',
        subjectName: 'Вища математика',
        weekType: 'ALL',
        room: 'ауд. 305',
        teacher: 'Коваленко О. П.',
      },
      {
        tempId: 'tpl-2',
        dayOfWeek: 1,
        lessonOrder: 2,
        lessonType: 'PRACTICE',
        startTime: '09:50',
        endTime: '11:10',
        subjectName: 'Програмування',
        weekType: 'ODD',
        room: 'комп. клас 12',
        teacher: 'Сидоренко В. М.',
      },
      // Вівторок
      {
        tempId: 'tpl-3',
        dayOfWeek: 2,
        lessonOrder: 1,
        lessonType: 'LECTURE',
        startTime: '08:20',
        endTime: '09:40',
        subjectName: 'Алгоритми та структури даних',
        weekType: 'ALL',
        room: 'ауд. 210',
        teacher: 'Мельник С. І.',
      },
      {
        tempId: 'tpl-4',
        dayOfWeek: 2,
        lessonOrder: 2,
        lessonType: 'PRACTICE',
        startTime: '09:50',
        endTime: '11:10',
        subjectName: 'Англійська мова за проф. спрямуванням',
        weekType: 'ALL',
        room: 'ауд. 415',
        teacher: 'Шевченко О. В.',
      },
      // Середа
      {
        tempId: 'tpl-5',
        dayOfWeek: 3,
        lessonOrder: 1,
        lessonType: 'LECTURE',
        startTime: '08:20',
        endTime: '09:40',
        subjectName: 'Архітектура компʼютерів',
        weekType: 'ALL',
        room: 'ауд. 110',
        teacher: 'Бондар Ю. А.',
      },
      {
        tempId: 'tpl-6',
        dayOfWeek: 3,
        lessonOrder: 2,
        lessonType: 'PRACTICE',
        startTime: '09:50',
        endTime: '11:10',
        subjectName: 'Вища математика',
        weekType: 'EVEN',
        room: 'ауд. 305',
        teacher: 'Коваленко О. П.',
      },
      // Четвер
      {
        tempId: 'tpl-7',
        dayOfWeek: 4,
        lessonOrder: 2,
        lessonType: 'PRACTICE',
        startTime: '09:50',
        endTime: '11:10',
        subjectName: 'Бази даних',
        weekType: 'ALL',
        room: 'комп. клас 14',
        teacher: 'Ткаченко Д. В.',
      },
      // П'ятниця
      {
        tempId: 'tpl-8',
        dayOfWeek: 5,
        lessonOrder: 1,
        lessonType: 'LECTURE',
        startTime: '08:20',
        endTime: '09:40',
        subjectName: 'Фізичне виховання',
        weekType: 'ALL',
        room: 'спорткомплекс',
        teacher: 'Григоренко І. О.',
      },
    ];

    setLessons(demoItems);
  };

  const handleSave = async () => {
    setError(null);

    // Validate that at least one lesson has a title
    const filledLessons = lessons.filter((l) => l.subjectName.trim().length > 0);

    if (filledLessons.length === 0) {
      setError('Будь ласка, заповніть назву хоча б для одного заняття або натисніть «Пропустити»');
      return;
    }

    setIsLoading(true);

    try {
      const payload: LessonScheduleInput[] = filledLessons.map((l) => ({
        dayOfWeek: l.dayOfWeek,
        lessonOrder: l.lessonOrder,
        lessonType: l.lessonType || 'LECTURE',
        startTime: l.startTime,
        endTime: l.endTime,
        subjectName: l.subjectName.trim(),
        weekType: l.weekType,
        room: l.room.trim() || 'дистанційно',
        teacher: l.teacher?.trim() || undefined,
      }));

      const res = await saveGroupWeeklyScheduleAction(payload);
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Не вдалося зберегти розклад');
      }
    } catch {
      setError('Виникла непередбачена помилка під час збереження розкладу');
    } finally {
      setIsLoading(false);
    }
  };

  const totalFilled = lessons.filter((l) => l.subjectName.trim().length > 0).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Top Banner */}
      <header className="border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                  {isEditingExisting ? 'Редактор розкладу групи' : 'Конструктор розкладу'}
                </h1>
                <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  Група {groupName}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Студент: <strong className="text-zinc-800 dark:text-zinc-200">{userName}</strong> • {isEditingExisting ? 'Зміна та налаштування пар на тиждень' : 'Швидке внесення пар на тиждень'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isEditingExisting ? 'Назад до розкладу' : 'Пропустити'}
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Зберегти ({totalFilled})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-20 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-4 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Helper Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                Створіть свій розклад або використайте зразок
              </h3>
              <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
                Ви можете накидати пари вручну для кожного дня, або заповнити зразковий розклад у 1 клік і відредагувати.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePrefillTemplate}
            className="self-start sm:self-auto shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
          >
            Вставити зразок розкладу
          </button>
        </div>

        {/* Day of Week Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {DAYS.map((day) => {
            const count = lessons.filter(
              (l) => l.dayOfWeek === day.id && l.subjectName.trim().length > 0
            ).length;
            const isCurrent = activeDay === day.id;

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setActiveDay(day.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span>{day.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lessons List for Active Day */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Пари на {DAYS.find((d) => d.id === activeDay)?.name}:
            </h3>
            <span className="text-xs text-zinc-400">
              {activeLessons.length} {activeLessons.length === 1 ? 'пара' : 'пари'} в списку
            </span>
          </div>

          {activeLessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-8 text-center">
              <p className="text-xs text-zinc-400">
                На цей день ще немає пар. Натисніть кнопку нижче, щоб додати першу пару!
              </p>
            </div>
          ) : (
            activeLessons.map((lesson) => (
              <div
                key={lesson.tempId}
                className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700 space-y-3"
              >
                {/* Header row: Order number, Week Type buttons, Delete */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {lesson.lessonOrder}
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {lesson.lessonOrder}-а пара
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Lesson Type buttons: Лекція / Практика */}
                    <div className="flex items-center gap-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-0.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(lesson.tempId, { lessonType: 'LECTURE' })}
                        className={`rounded-lg px-2 py-1 transition-all cursor-pointer ${
                          (lesson.lessonType || 'LECTURE') === 'LECTURE'
                            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        Лекція
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(lesson.tempId, { lessonType: 'PRACTICE' })}
                        className={`rounded-lg px-2 py-1 transition-all cursor-pointer ${
                          lesson.lessonType === 'PRACTICE'
                            ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        Практика
                      </button>
                    </div>

                    {/* Week Type buttons */}
                    <div className="flex items-center gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-0.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(lesson.tempId, { weekType: 'ALL' })}
                        className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                          lesson.weekType === 'ALL'
                            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        Щотижня
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(lesson.tempId, { weekType: 'ODD' })}
                        className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                          lesson.weekType === 'ODD'
                            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                        title="Непарний тиждень (Чисельник)"
                      >
                        Чисельник (I)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLesson(lesson.tempId, { weekType: 'EVEN' })}
                        className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                          lesson.weekType === 'EVEN'
                            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                        title="Парний тиждень (Знаменник)"
                      >
                        Знаменник (II)
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lesson.tempId)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Видалити пару"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subject name input */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    Назва дисципліни / предмета *
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={lesson.subjectName}
                      onChange={(e) =>
                        handleUpdateLesson(lesson.tempId, { subjectName: e.target.value })
                      }
                      placeholder="Наприклад: Вища математика або Веб-розробка"
                      className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2 pl-9.5 pr-3 text-sm font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Sub-row: Time bells, Room, Teacher */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  {/* Time */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                      Час (дзвінки)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="time"
                          value={lesson.startTime}
                          onChange={(e) =>
                            handleUpdateLesson(lesson.tempId, { startTime: e.target.value })
                          }
                          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1.5 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <span className="text-zinc-400">—</span>
                      <div className="relative flex-1">
                        <input
                          type="time"
                          value={lesson.endTime}
                          onChange={(e) =>
                            handleUpdateLesson(lesson.tempId, { endTime: e.target.value })
                          }
                          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1.5 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Room */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                      Аудиторія / Посилання
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
                        <MapPin className="w-3 h-3" />
                      </div>
                      <input
                        type="text"
                        value={lesson.room}
                        onChange={(e) =>
                          handleUpdateLesson(lesson.tempId, { room: e.target.value })
                        }
                        placeholder="ауд. 305 або Zoom"
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-1.5 pl-7 pr-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Teacher */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                      Викладач (необовʼязково)
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
                        <User className="w-3 h-3" />
                      </div>
                      <input
                        type="text"
                        value={lesson.teacher || ''}
                        onChange={(e) =>
                          handleUpdateLesson(lesson.tempId, { teacher: e.target.value })
                        }
                        placeholder="Іванов І. І."
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-1.5 pl-7 pr-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Add lesson button */}
          <button
            type="button"
            onClick={handleAddLesson}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 py-3.5 px-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Додати пару до {DAYS.find((d) => d.id === activeDay)?.name}</span>
          </button>
        </div>

        {/* Bottom Actions Bar */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Заповнено пар: {totalFilled}</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Ви завжди зможете відредагувати або доповнити розклад у щоденнику.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-center"
            >
              Пропустити
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || totalFilled === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Зберегти розклад та перейти до щоденника</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
