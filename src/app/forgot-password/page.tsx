'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck2,
  Mail,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { requestPasswordResetAction } from '@/app/authActions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await requestPasswordResetAction(email);
      if (res.success) {
        setSuccessMessage(res.message || 'Посилання для скидання пароля надіслано у ваш Telegram!');
      } else {
        setError(res.error || 'Не вдалося надіслати запит на скидання пароля');
      }
    } catch {
      setError('Виникла непередбачена помилка. Спробуйте пізніше.');
    } finally {
      setIsLoading(false);
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
            Відновлення пароля
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Отримайте безпечне посилання у свій Telegram-бот
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xl border border-zinc-200/80 dark:border-zinc-800">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-3.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMessage ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Перевірте ваш Telegram!
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                  {successMessage}
                </p>
                <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                  Посилання дійсне впродовж 15 хвилин. Перейдіть за ним для встановлення нового пароля.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Повернутися до входу</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage(null);
                    setError(null);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 py-1"
                >
                  Надіслати ще раз
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Електронна пошта акаунта
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
                <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Вкажіть пошту, привʼязану до вашого профілю. Посилання для скидання надійде прямо у Telegram-бота.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-2.5 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Отримати посилання в Telegram</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Повернутися до входу</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
