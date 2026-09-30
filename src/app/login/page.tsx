'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarCheck2,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { loginAction, demoLoginAction } from '@/app/authActions';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginAction({ email, password });
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Помилка входу');
      }
    } catch {
      setError('Виникла непередбачена помилка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsDemoLoading(true);

    try {
      const res = await demoLoginAction();
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Помилка тестового входу');
      }
    } catch {
      setError('Виникла помилка тестового входу');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-zinc-900 dark:text-zinc-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* App Logo & Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <CalendarCheck2 className="w-8 h-8" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
            Шарага Diary
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Вхід до персонального кабінету та розкладу
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xl border border-zinc-200/80 dark:border-zinc-800">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-3.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="student@sharaga.ua"
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2.5 pl-9.5 pr-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                >
                  Пароль
                </label>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2.5 pl-9.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isDemoLoading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-2.5 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Увійти</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-400 font-semibold">
                або швидкий тест
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading || isDemoLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 py-2.5 px-4 text-xs font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 transition-colors cursor-pointer"
          >
            {isDemoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-500" />
            )}
            <span>Увійти як Демо-студент (КН-21)</span>
          </button>

          {/* Register Link */}
          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Ще не маєте акаунта?{' '}
            <Link
              href="/register"
              className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Зареєструватися
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
