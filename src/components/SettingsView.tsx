'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Users,
  Database,
  Check,
  CalendarPlus,
  Sparkles,
  Loader2,
  Info,
  Calendar,
  CalendarDays,
  LogOut,
} from 'lucide-react';
import { seedDemoWeekAction } from '@/app/actions';
import { logoutAction } from '@/app/authActions';
import { getAcademicYearStart, formatDateUk } from '@/lib/dateUtils';

interface SettingsViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    role?: 'STUDENT' | 'ADMIN';
    group: {
      name: string;
    } | null;
  } | null;
  totalSchedules: number;
  currentWeekNumber?: number;
  currentWeekType?: 'ODD' | 'EVEN';
}

export function SettingsView({
  user,
  totalSchedules,
  currentWeekNumber,
  currentWeekType,
}: SettingsViewProps) {
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const semesterStart = getAcademicYearStart();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  const handleSeedDemo = () => {
    startTransition(async () => {
      setStatusMessage(null);
      const res = await seedDemoWeekAction();
      if (res.success) {
        setStatusMessage('Розклад на всі дні тижня успішно додано!');
      } else {
        setStatusMessage(res.error || 'Помилка завантаження');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            Профіль студента
          </h3>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/90 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:border-rose-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Вийти з акаунта</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-sm">
            {user?.name?.[0] || 'С'}
          </div>
          <div>
            <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {user?.name || 'Студент'}
            </h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {user?.email || 'student@sharaga.ua'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Users className="w-3 h-3" />
                Група: {user?.group?.name || 'КН-21'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Calendar Settings */}
      <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          Навчальний семестр та автовизначення тижня
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3.5 border border-zinc-100 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
              Дата старту поточного семестру
            </span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200 text-base">
              {formatDateUk(semesterStart, true)}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              1 вересня (за замовчуванням)
            </span>
          </div>

          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3.5 border border-zinc-100 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
              Поточний тиждень семестру
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-base">
                {currentWeekNumber || 1}-й тиждень
              </span>
              <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {currentWeekType === 'EVEN' ? 'Парний (II)' : 'Непарний (I)'}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              Визначається автоматично для поточного дня
            </span>
          </div>
        </div>
      </div>

      {/* Schedule Management Section */}
      <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            Розклад занять {user?.group?.name ? `(${user.group.name})` : ''}
          </h3>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {totalSchedules} пар у розкладі
          </span>
        </div>

        {isAdmin ? (
          <>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Ви маєте права адміністратора. Ви можете керувати групами, дисциплінами та конструювати розклад у спеціальній панелі керування.
            </p>

            <div className="pt-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Відкрити панель керування (/admin)</span>
              </Link>
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Розклад формується та редагується адміністратором. Ви маєте режим перегляду розкладу та ведення власних завдань і відміток.
          </p>
        )}
      </div>

      {/* Database & App Information */}
      <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500" />
          Стан бази даних
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3 border border-zinc-100 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Провайдер</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              PostgreSQL (Prisma ORM)
            </span>
          </div>
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3 border border-zinc-100 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
              Кількість занять у базі
            </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {totalSchedules} пар
            </span>
          </div>
        </div>

        {/* Demo week filler (ADMIN ONLY) */}
        {isAdmin && (
          <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 p-4 border border-indigo-100 dark:border-indigo-900/60 mt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Заповнити розклад на весь тиждень (Вт - Пт)
                </h4>
                <p className="mt-0.5 text-xs text-indigo-800/80 dark:text-indigo-300">
                  У початковому seed.ts розклад додано лише для Понеділка. Натисніть цю кнопку, якщо
                  бажаєте наповнити решту днів тижня зразковими парами.
                </p>

                {statusMessage && (
                  <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {statusMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSeedDemo}
                  disabled={isPending}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CalendarPlus className="w-3.5 h-3.5" />
                  )}
                  <span>Наповнити повний тиждень</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* About App */}
      <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-zinc-400" />
          Про додаток
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Шарага Dairy — персональний електронний щоденник студента: адаптивний розклад з
          автоматичним визначенням поточного дня та навчального тижня (парний/непарний) від 1
          вересня, календарна привʼязка домашніх завдань (UserTask) до дати заняття, можливість
          виставлення та збереження балів безпосередньо в картці пари з миттєвим перерахунком у журналі
          успішності.
        </p>
      </div>
    </div>
  );
}
