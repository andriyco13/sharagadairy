'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  User,
  Loader2,
  AlertCircle,
  Check,
  Plus,
  GraduationCap,
  FlaskConical,
} from 'lucide-react';
import {
  createScheduleItemAction,
  updateScheduleItemAction,
  ScheduleItemInput,
} from '@/app/actions';
import { BELL_SCHEDULE, LESSON_ORDERS, getBellSchedule } from '@/lib/constants';

export interface SubjectOption {
  id: string;
  name: string;
  controlType?: 'EXAM' | 'CREDIT';
  lecturer?: string | null;
  practitioner?: string | null;
}

export interface LessonInitialData {
  id?: string;
  subjectId?: string;
  dayOfWeek: number;
  lessonOrder: number;
  lessonType?: 'LECTURE' | 'PRACTICE';
  startTime: string;
  endTime: string;
  subjectName?: string;
  weekType: 'ALL' | 'EVEN' | 'ODD';
  room: string;
  teacher?: string | null;
}

interface ScheduleLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: LessonInitialData | null;
  defaultDay?: number;
  subjects: SubjectOption[];
  onOpenCreateSubject?: () => void;
}

const DAYS = [
  { id: 1, short: 'Пн', name: 'Понеділок' },
  { id: 2, short: 'Вт', name: 'Вівторок' },
  { id: 3, short: 'Ср', name: 'Середа' },
  { id: 4, short: 'Чт', name: 'Четвер' },
  { id: 5, short: 'Пт', name: "П'ятниця" },
];

interface FormProps {
  initialData?: LessonInitialData | null;
  defaultDay: number;
  subjects: SubjectOption[];
  onClose: () => void;
  onOpenCreateSubject?: () => void;
}

function ScheduleLessonForm({
  initialData,
  defaultDay,
  subjects,
  onClose,
  onOpenCreateSubject,
}: FormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  // Selected subject
  const [subjectId, setSubjectId] = useState<string>(() => {
    if (initialData?.subjectId) return initialData.subjectId;
    if (initialData?.subjectName) {
      const match = subjects.find(
        (s) => s.name.toLowerCase() === initialData.subjectName?.toLowerCase()
      );
      if (match) return match.id;
    }
    return subjects[0]?.id || '';
  });

  // Fallback subject name if no subjects exist yet
  const [customSubjectName, setCustomSubjectName] = useState<string>(() => initialData?.subjectName ?? '');

  // Lesson type: LECTURE or PRACTICE
  const [lessonType, setLessonType] = useState<'LECTURE' | 'PRACTICE'>(
    () => initialData?.lessonType ?? 'LECTURE'
  );

  const [dayOfWeek, setDayOfWeek] = useState<number>(() => initialData?.dayOfWeek ?? defaultDay);
  const [lessonOrder, setLessonOrder] = useState<number>(() => initialData?.lessonOrder ?? 1);

  const defaultBells = getBellSchedule(initialData?.lessonOrder ?? 1);
  const [startTime, setStartTime] = useState<string>(
    () => initialData?.startTime ?? defaultBells.startTime
  );
  const [endTime, setEndTime] = useState<string>(
    () => initialData?.endTime ?? defaultBells.endTime
  );

  const [weekType, setWeekType] = useState<'ALL' | 'EVEN' | 'ODD'>(() => initialData?.weekType ?? 'ALL');
  const [room, setRoom] = useState<string>(() => initialData?.room ?? 'ауд. 101');
  const [teacher, setTeacher] = useState<string>(() => initialData?.teacher ?? '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to resolve auto-teacher based on current subject and lessonType
  const resolveAutoTeacher = (subjId: string, type: 'LECTURE' | 'PRACTICE') => {
    const s = subjects.find((sub) => sub.id === subjId);
    if (!s) return '';
    if (type === 'LECTURE') {
      return s.lecturer || '';
    } else {
      return s.practitioner || '';
    }
  };

  // If initialData doesn't specify a teacher or on clean start, set initial teacher
  useEffect(() => {
    if (!initialData?.teacher && subjectId) {
      const autoTeacher = resolveAutoTeacher(subjectId, lessonType);
      if (autoTeacher) {
        setTeacher(autoTeacher);
      }
    }
  }, []);

  // Handle subject change: automatically pull teacher
  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    const autoTeacher = resolveAutoTeacher(newSubjectId, lessonType);
    setTeacher(autoTeacher);
  };

  // Handle lesson type change: automatically switch teacher between lecturer and practitioner
  const handleLessonTypeChange = (newType: 'LECTURE' | 'PRACTICE') => {
    setLessonType(newType);
    if (subjectId) {
      const autoTeacher = resolveAutoTeacher(subjectId, newType);
      setTeacher(autoTeacher);
    }
  };

  // Handle lesson order change (1–8): automatically update bell times
  const handleLessonOrderChange = (order: number) => {
    setLessonOrder(order);
    const bells = getBellSchedule(order);
    setStartTime(bells.startTime);
    setEndTime(bells.endTime);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId && !customSubjectName.trim()) {
      setError('Оберіть або вкажіть назву предмета');
      return;
    }

    setIsLoading(true);
    setError(null);

    const inputData: ScheduleItemInput = {
      subjectId: subjectId || undefined,
      subjectName: subjectId ? undefined : customSubjectName.trim(),
      dayOfWeek,
      lessonOrder,
      lessonType,
      startTime: startTime.trim() || getBellSchedule(lessonOrder).startTime,
      endTime: endTime.trim() || getBellSchedule(lessonOrder).endTime,
      weekType,
      room: room.trim() || 'дистанційно',
      teacher: teacher.trim() || null,
    };

    let res;
    if (isEditing && initialData?.id) {
      res = await updateScheduleItemAction(initialData.id, inputData);
    } else {
      res = await createScheduleItemAction(inputData);
    }

    setIsLoading(false);

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(res.error || 'Помилка збереження пари');
    }
  };

  const currentSubject = subjects.find((s) => s.id === subjectId);

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Day of Week Selector */}
      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
          День тижня
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDayOfWeek(d.id)}
              className={`flex flex-col items-center justify-center py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                dayOfWeek === d.id
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/20'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <span className="font-bold">{d.short}</span>
              <span className="text-[10px] opacity-75">{d.name.slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject Selector (Dropdown of existing subjects) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Предмет / Дисципліна <span className="text-rose-500">*</span>
          </label>
          {onOpenCreateSubject && (
            <button
              type="button"
              onClick={onOpenCreateSubject}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Створити новий предмет</span>
            </button>
          )}
        </div>

        {subjects.length > 0 ? (
          <div className="relative">
            <BookOpen className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400 pointer-events-none" />
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 pr-8 py-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.controlType === 'EXAM' ? '(Іспит)' : '(Залік)'}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <BookOpen className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
              <input
                type="text"
                required
                value={customSubjectName}
                onChange={(e) => setCustomSubjectName(e.target.value)}
                placeholder="Введіть назву предмета..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            {onOpenCreateSubject && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>Предметів у базі ще немає.</span>
                <button
                  type="button"
                  onClick={onOpenCreateSubject}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Створити предмет з викладачами
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lesson Type Radio: Лекція / Практика */}
      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
          Тип пари
        </label>
        <div className="grid grid-cols-2 gap-2">
          {/* Radio Лекція */}
          <label
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
              lessonType === 'LECTURE'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-600/20 text-indigo-900 dark:text-indigo-200'
                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <input
              type="radio"
              name="lessonType"
              value="LECTURE"
              checked={lessonType === 'LECTURE'}
              onChange={() => handleLessonTypeChange('LECTURE')}
              className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-100 dark:bg-indigo-900/60 p-1 text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Лекція</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {currentSubject?.lecturer ? `Лектор: ${currentSubject.lecturer}` : 'Викладач лекцій'}
                </span>
              </div>
            </div>
          </label>

          {/* Radio Практика */}
          <label
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
              lessonType === 'PRACTICE'
                ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/60 ring-2 ring-emerald-600/20 text-emerald-900 dark:text-emerald-200'
                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <input
              type="radio"
              name="lessonType"
              value="PRACTICE"
              checked={lessonType === 'PRACTICE'}
              onChange={() => handleLessonTypeChange('PRACTICE')}
              className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/60 p-1 text-emerald-600 dark:text-emerald-400">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Практика</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {currentSubject?.practitioner ? `Практик: ${currentSubject.practitioner}` : 'Викладач практик'}
                </span>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Lesson Order Selection (1–8) with Automatic Bell Time Assignment */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Номер пари (1–8)
          </label>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            {startTime} — {endTime}
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {LESSON_ORDERS.map((num) => {
            const bell = BELL_SCHEDULE[num];
            const isSelected = lessonOrder === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => handleLessonOrderChange(num)}
                title={`${num} пара: ${bell.startTime}–${bell.endTime}`}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/20'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="text-xs font-black">{num}</span>
                <span
                  className={`text-[9px] font-medium leading-tight ${
                    isSelected ? 'text-indigo-100' : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {bell.startTime}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time bells inputs (Editable if non-standard) */}
      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
          Час дзвінків (автопідстановка за розкладом 1–8 пар)
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Clock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-8 pr-2 py-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
          <span className="text-zinc-400 text-xs">—</span>
          <div className="relative flex-1">
            <Clock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-8 pr-2 py-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Week Parity Switcher */}
      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
          Періодичність / Тип тижня
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setWeekType('ALL')}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
              weekType === 'ALL'
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/20'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Щотижня</span>
            <span className="block text-[10px] opacity-75 font-normal">Постійна пара</span>
          </button>
          <button
            type="button"
            onClick={() => setWeekType('ODD')}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
              weekType === 'ODD'
                ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-2 ring-amber-600/20'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Чисельник</span>
            <span className="block text-[10px] opacity-75 font-normal">Непарний (I)</span>
          </button>
          <button
            type="button"
            onClick={() => setWeekType('EVEN')}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
              weekType === 'EVEN'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-2 ring-blue-600/20'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Знаменник</span>
            <span className="block text-[10px] opacity-75 font-normal">Парний (II)</span>
          </button>
        </div>
      </div>

      {/* Room & Teacher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Номер аудиторії
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              required
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="напр. ауд. 305 / онлайн"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Викладач {lessonType === 'LECTURE' ? '(лектор)' : '(практик)'}
          </label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Підтягується автоматично або введіть вручну"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Скасувати
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{isEditing ? 'Зберегти зміни' : 'Додати пару'}</span>
        </button>
      </div>
    </form>
  );
}

export function ScheduleLessonModal({
  isOpen,
  onClose,
  initialData,
  defaultDay = 1,
  subjects = [],
  onOpenCreateSubject,
}: ScheduleLessonModalProps) {
  if (!isOpen) return null;

  const isEditing = Boolean(initialData?.id);
  const formKey = initialData?.id || `new-${defaultDay}-${subjects.length}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isEditing ? 'Редагувати пару' : 'Додати пару до розкладу'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isEditing ? 'Зміна параметрів заняття' : 'Створення нового заняття в розкладі групи'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Form with key for clean state lifecycle */}
        <ScheduleLessonForm
          key={formKey}
          initialData={initialData}
          defaultDay={defaultDay}
          subjects={subjects}
          onClose={onClose}
          onOpenCreateSubject={onOpenCreateSubject}
        />
      </div>
    </div>
  );
}
