'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarCheck2,
  Lock,
  Mail,
  User as UserIcon,
  Users,
  PlusCircle,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { registerAction, getAvailableGroupsAction } from '@/app/authActions';

export interface GroupItem {
  id: string;
  name: string;
  _count: { users: number; schedules: number };
}

interface RegisterClientProps {
  initialGroups?: GroupItem[];
}

export default function RegisterClient({ initialGroups = [] }: RegisterClientProps) {
  const router = useRouter();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Group choice: 'existing' | 'new'
  const [groupChoice, setGroupChoice] = useState<'existing' | 'new'>(
    initialGroups.length > 0 ? 'existing' : 'new'
  );
  const [existingGroupId, setExistingGroupId] = useState<string>(
    initialGroups.length > 0 ? initialGroups[0].id : ''
  );
  const [newGroupName, setNewGroupName] = useState<string>('');

  // Groups list from DB
  const [groups, setGroups] = useState<GroupItem[]>(initialGroups);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Status & error
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    setIsFetchingGroups(true);
    setFetchError(null);
    try {
      // Relative URL fetch ensuring proper routing when accessed via local network IP or localhost
      const res = await fetch('/api/groups', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
        if (data.groups.length > 0) {
          setExistingGroupId((prev) => {
            if (prev && data.groups.some((g: GroupItem) => g.id === prev)) {
              return prev;
            }
            return data.groups[0].id;
          });
          setGroupChoice('existing');
        } else {
          setGroupChoice('new');
        }
        return;
      }
      throw new Error(data.error || 'Не вдалося отримати групи');
    } catch (apiError) {
      console.warn('Relative fetch /api/groups failed, trying server action fallback:', apiError);
      try {
        const actionRes = await getAvailableGroupsAction();
        if (actionRes.success && Array.isArray(actionRes.groups)) {
          setGroups(actionRes.groups);
          if (actionRes.groups.length > 0) {
            setExistingGroupId((prev) => {
              if (prev && actionRes.groups.some((g) => g.id === prev)) {
                return prev;
              }
              return actionRes.groups[0].id;
            });
            setGroupChoice('existing');
          } else {
            setGroupChoice('new');
          }
          return;
        }
        throw new Error(actionRes.error || 'Помилка завантаження груп');
      } catch (fallbackError) {
        console.error('All group fetch strategies failed:', fallbackError);
        setFetchError('Не вдалося завантажити список груп. Спробуйте оновити.');
      }
    } finally {
      setIsFetchingGroups(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await registerAction({
        name,
        email,
        password,
        groupChoice,
        existingGroupId: groupChoice === 'existing' ? existingGroupId : undefined,
        newGroupName: groupChoice === 'new' ? newGroupName : undefined,
      });

      if (res.success) {
        if (res.isNewGroup) {
          // New group created -> redirect to onboarding wizard to fill in schedule!
          router.push('/onboarding/schedule');
        } else {
          // Joined existing group -> redirect directly to diary
          router.push('/');
        }
        router.refresh();
      } else {
        setError(res.error || 'Помилка реєстрації');
      }
    } catch {
      setError('Виникла непередбачена помилка під час реєстрації');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-zinc-900 dark:text-zinc-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <CalendarCheck2 className="w-8 h-8" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
            Реєстрація студента
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Створіть свій щоденник або приєднайтеся до групи
          </p>
        </div>

        {/* Card */}
        <div className="mt-7 rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xl border border-zinc-200/80 dark:border-zinc-800">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-3.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
              >
                Ваше ім&apos;я та прізвище
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Олександр Петренко"
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2.5 pl-9.5 pr-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
              >
                Електронна пошта
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2.5 pl-9.5 pr-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
              >
                Пароль (від 6 символів)
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2.5 pl-9.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Group Selection Section with Two Switchers */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Академічна група
                </label>
                <button
                  type="button"
                  onClick={() => loadGroups()}
                  disabled={isFetchingGroups}
                  title="Оновити список груп"
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGroups ? 'animate-spin' : ''}`} />
                  <span>Оновити</span>
                </button>
              </div>

              {fetchError && (
                <div className="mb-3 flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{fetchError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadGroups()}
                    className="font-bold underline ml-2 hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer"
                  >
                    Повторити
                  </button>
                </div>
              )}

              {/* Two switchers / tabs */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 p-1 mb-3.5">
                <button
                  type="button"
                  onClick={() => setGroupChoice('existing')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                    groupChoice === 'existing'
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Обрати існуючу</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGroupChoice('new')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                    groupChoice === 'new'
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Створити нову</span>
                </button>
              </div>

              {/* Existing group selector */}
              {groupChoice === 'existing' && (
                <div>
                  {isFetchingGroups ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-zinc-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Завантаження груп...</span>
                    </div>
                  ) : groups.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={existingGroupId}
                        onChange={(e) => setExistingGroupId(e.target.value)}
                        className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2.5 px-3 text-sm font-semibold text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g._count.schedules} пар, {g._count.users} студ.)
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Розклад та предмети цієї групи підтягнуться автоматично.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                      Наразі немає збережених груп. Будь ласка, оберіть «Створити нову групу» або натисніть «Оновити».
                    </div>
                  )}
                </div>
              )}

              {/* Create new group input */}
              {groupChoice === 'new' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Наприклад: ІПЗ-22 або КН-32"
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2.5 px-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="flex items-start gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Після реєстрації відкриється зручний майстер розкладу, де ви зможете вказати пари для вашої групи.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-2.5 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {groupChoice === 'new' ? 'Продовжити до розкладу' : 'Зареєструватися'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Вже маєте акаунт?{' '}
            <Link
              href="/login"
              className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Увійти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
