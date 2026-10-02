'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  Sparkles,
  Coffee,
  GraduationCap,
  Settings2,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  LogOut,
  Loader2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { LessonCard, ScheduleItem } from './LessonCard';
import { BottomNav, TabType } from './BottomNav';
import { GradesView, SubjectWithGrades } from './GradesView';
import { SettingsView } from './SettingsView';
import { ScheduleLessonModal } from './ScheduleLessonModal';
import { SubjectModal } from './SubjectModal';
import { seedDemoWeekAction } from '@/app/actions';
import { logoutAction } from '@/app/authActions';
import {
  getWeekNumberAndType,
  getDateForDayOfWeek,
  formatDateUk,
  formatWeekRangeUk,
  isSameCalendarDay,
} from '@/lib/dateUtils';

interface ScheduleViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    role?: 'STUDENT' | 'ADMIN';
    notifyBrowser?: boolean;
    notifyTelegram?: boolean;
    telegramChatId?: string | null;
    notifyMinutesBefore?: number;
    group: {
      name: string;
    } | null;
  } | null;
  schedules: ScheduleItem[];
  subjects: SubjectWithGrades[];
}

const DAYS = [
  { id: 1, short: 'Пн', full: 'Понеділок' },
  { id: 2, short: 'Вт', full: 'Вівторок' },
  { id: 3, short: 'Ср', full: 'Середа' },
  { id: 4, short: 'Чт', full: 'Четвер' },
  { id: 5, short: 'Пт', full: "П'ятниця" },
];

export function ScheduleView({ user, schedules, subjects }: ScheduleViewProps) {
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  // Real-world current date and weekday
  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon ... 5 is Fri, 6 is Sat
  const isWeekday = todayDayOfWeek >= 1 && todayDayOfWeek <= 5;
  const initialDay = isWeekday ? todayDayOfWeek : 1;

  // Real-world week auto-detection relative to semester start (Sept 1)
  const realWeekInfo = getWeekNumberAndType(today);

  // Active view states
  // viewMonday represents the Monday of the currently inspected week
  const [viewMonday, setViewMonday] = useState<Date>(() => realWeekInfo.weekMonday);
  // selectedDay is 1 (Mon) .. 5 (Fri), auto-selected to today's weekday
  const [selectedDay, setSelectedDay] = useState<number>(() => initialDay);
  // subjects state with user grades
  const [subjectsState, setSubjectsState] = useState<SubjectWithGrades[]>(subjects);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Schedule lesson add/edit modal states
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingLessonData, setEditingLessonData] = useState<{
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
  } | null>(null);

  const handleOpenAddModal = (targetDay?: number) => {
    if (targetDay !== undefined) {
      setSelectedDay(targetDay);
    }
    setEditingLessonData(null);
    setIsLessonModalOpen(true);
  };

  const handleOpenEditModal = (schedule: ScheduleItem) => {
    setEditingLessonData({
      id: schedule.id,
      subjectId: schedule.subjectId,
      dayOfWeek: schedule.dayOfWeek,
      lessonOrder: schedule.lessonOrder,
      lessonType: schedule.lessonType,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      subjectName: schedule.subject.name,
      weekType: schedule.weekType,
      room: schedule.room,
      teacher: schedule.teacher,
    });
    setIsLessonModalOpen(true);
  };

  const existingSubjectNames = Array.from(new Set(subjectsState.map((s) => s.name)));

  // Keep subjects in sync with server revalidations
  const [prevSubjects, setPrevSubjects] = useState(subjects);
  if (subjects !== prevSubjects) {
    setPrevSubjects(subjects);
    setSubjectsState(subjects);
  }

  // Derived week properties for currently viewed week
  const currentWeekInfo = getWeekNumberAndType(viewMonday);
  const { weekNumber, weekType } = currentWeekInfo;

  // Active calendar date corresponding to selectedDay in the current view week
  const activeDate = getDateForDayOfWeek(viewMonday, selectedDay);
  const isViewingToday = isSameCalendarDay(activeDate, today);
  const isViewingCurrentWeek = isSameCalendarDay(viewMonday, realWeekInfo.weekMonday);

  // Filter schedules for the selected day and active week parity ('ODD' or 'EVEN')
  const daySchedules = schedules
    .filter(
      (item) =>
        item.dayOfWeek === selectedDay &&
        (item.weekType === 'ALL' || item.weekType === weekType)
    )
    .sort((a, b) => a.lessonOrder - b.lessonOrder);

  // Helper count of lessons per day for current week type
  const getLessonCountForDay = (dayId: number) => {
    return schedules.filter(
      (item) =>
        item.dayOfWeek === dayId &&
        (item.weekType === 'ALL' || item.weekType === weekType)
    ).length;
  };

  // Week navigation handlers
  const handlePrevWeek = () => {
    setViewMonday((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
  };

  const handleNextWeek = () => {
    setViewMonday((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
  };

  const handleResetToToday = () => {
    setViewMonday(realWeekInfo.weekMonday);
    setSelectedDay(initialDay);
  };

  const handleSetWeekType = (targetType: 'ODD' | 'EVEN') => {
    if (targetType === weekType) return;
    // Shift week by 1 week to toggle between odd and even
    setViewMonday((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
  };

  const handleSeedDemo = async () => {
    setIsDemoLoading(true);
    await seedDemoWeekAction();
    setIsDemoLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Sharaga
                </h1>
                <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  {user?.group?.name || 'Без групи'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {user?.name || 'Студент'} • {DAYS.find((d) => d.id === selectedDay)?.full},{' '}
                {formatDateUk(activeDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Розклад</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('grades')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'grades'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Успішність</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Налаштування</span>
              </button>
            </nav>

            {/* User Profile & Logout Button */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 sm:border-l sm:border-zinc-200 dark:sm:border-zinc-800">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Панель керування"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Панель керування</span>
                </Link>
              )}
              <span className="hidden sm:inline text-xs font-bold text-zinc-700 dark:text-zinc-300 max-w-[130px] truncate">
                {user?.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Вийти з акаунта"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200/90 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:border-rose-900/60 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span className="hidden md:inline">Вийти</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-24 md:pb-12">
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Top Controls: Week Switcher & Day Selector */}
            <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xs space-y-4">
              {/* Row 1: Week Navigation & Parity Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Тиждень розкладу
                    </span>
                    {isViewingCurrentWeek ? (
                      <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        Поточний
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetToToday}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>До сьогодні</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {weekNumber}-й навчальний тиждень
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {weekType === 'ODD' ? 'Непарний (I)' : 'Парний (II)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {formatWeekRangeUk(viewMonday)} • семестр з 1 вересня
                  </p>
                </div>

                {/* Week controls: Prev / Next / Toggle */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {/* Prev / Next week buttons */}
                  <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-0.5 border border-zinc-200/50 dark:border-zinc-700/50">
                    <button
                      type="button"
                      onClick={handlePrevWeek}
                      className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                      title="Попередній тиждень"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextWeek}
                      className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                      title="Наступний тиждень"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Segmented control toggle */}
                  <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
                    <button
                      type="button"
                      onClick={() => handleSetWeekType('ODD')}
                      className={`flex items-center gap-1 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all ${
                        weekType === 'ODD'
                          ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span>Непарний</span>
                      <span className="text-[10px] opacity-75">(I)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetWeekType('EVEN')}
                      className={`flex items-center gap-1 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all ${
                        weekType === 'EVEN'
                          ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span>Парний</span>
                      <span className="text-[10px] opacity-75">(II)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Day of Week Selector (Пн - Пт) with Calendar Dates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    День тижня
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Обрано:{' '}
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {DAYS.find((d) => d.id === selectedDay)?.full},{' '}
                      {formatDateUk(activeDate)}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {DAYS.map((day) => {
                    const dayDate = getDateForDayOfWeek(viewMonday, day.id);
                    const isSelected = selectedDay === day.id;
                    const isDayToday = isSameCalendarDay(dayDate, today);
                    const count = getLessonCountForDay(day.id);
                    const dayNumber = dayDate.getDate();

                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => setSelectedDay(day.id)}
                        className={`group relative flex flex-col items-center justify-center rounded-xl p-2 sm:py-3 transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/50'
                        }`}
                      >
                        {isDayToday && (
                          <span
                            className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${
                              isSelected ? 'bg-amber-300 ring-2 ring-white/40' : 'bg-emerald-500 animate-pulse'
                            }`}
                            title="Сьогодні"
                          />
                        )}

                        <div className="flex items-baseline gap-1">
                          <span className="text-sm sm:text-base font-black tracking-tight">
                            {day.short}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? 'text-indigo-200' : 'text-zinc-400 dark:text-zinc-500'
                            }`}
                          >
                            {dayNumber}
                          </span>
                        </div>

                        <span
                          className={`hidden sm:inline-block text-[11px] font-medium leading-none mt-0.5 ${
                            isSelected ? 'text-indigo-100' : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {day.full}
                        </span>

                        <span
                          className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : count > 0
                              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                              : 'text-zinc-400 dark:text-zinc-500'
                          }`}
                        >
                          {count > 0 ? `${count} пар` : '—'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Schedule Cards Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Розклад на {DAYS.find((d) => d.id === selectedDay)?.full}
                </h2>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  ({formatDateUk(activeDate, true)})
                </span>
                {isViewingToday && (
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Сьогодні
                  </span>
                )}
                <span className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {daySchedules.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline mr-1">
                  {weekNumber}-й тиждень ({weekType === 'ODD' ? 'Непарний' : 'Парний'})
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(selectedDay)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Додати пару</span>
                  </button>
                )}
              </div>
            </div>

            {/* List of Lesson Cards for Selected Day */}
            {daySchedules.length > 0 ? (
              <div className="space-y-4">
                {daySchedules.map((schedule) => (
                  <LessonCard
                    key={schedule.id}
                    schedule={schedule}
                    activeDate={activeDate}
                    isToday={isViewingToday}
                    onEditLesson={handleOpenEditModal}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            ) : (
              /* Empty state when no lessons on selected day */
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-8 sm:p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 mb-3">
                  <Coffee className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Пар на цей день немає!
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  На {DAYS.find((d) => d.id === selectedDay)?.full} ({formatDateUk(activeDate)}) для{' '}
                  {weekType === 'ODD' ? 'непарного' : 'парного'} тижня занять не заплановано. Гарний
                  привід відпочити або зробити домашнє завдання!
                </p>

                {isAdmin && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(selectedDay)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Додати пару на цей день</span>
                    </button>

                    {/* Option to seed full week if only Monday was populated */}
                    {schedules.length <= 2 && (
                      <button
                        type="button"
                        onClick={handleSeedDemo}
                        disabled={isDemoLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span>Додати зразковий розклад на всі дні тижня</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Grades Tab */}
        {activeTab === 'grades' && (
          <GradesView
            subjects={subjectsState}
            onSubjectsChange={setSubjectsState}
            isAdmin={isAdmin}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsView
            user={user}
            totalSchedules={schedules.length}
            currentWeekNumber={weekNumber}
            currentWeekType={weekType}
          />
        )}
      </main>

      {/* Schedule Lesson Add/Edit Modal */}
      <ScheduleLessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        initialData={editingLessonData}
        defaultDay={selectedDay}
        subjects={subjectsState}
        onOpenCreateSubject={() => setIsSubjectModalOpen(true)}
      />

      {/* Subject Create Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSaved={(newSubj) => {
          setSubjectsState((prev) => {
            const exists = prev.some((s) => s.id === newSubj.id);
            if (exists) {
              return prev.map((s) => (s.id === newSubj.id ? { ...s, ...newSubj } : s));
            }
            return [...prev, { ...newSubj, assignments: [] }];
          });
        }}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
