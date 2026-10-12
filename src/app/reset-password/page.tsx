'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarCheck2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { verifyResetTokenAction, resetPasswordAction } from '@/app/authActions';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setTokenError('Відсутній або некоректний токен для відновлення пароля.');
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await verifyResetTokenAction(token);
        if (!isMounted) return;
        if (!res.valid) {
          setTokenError(res.error || 'Посилання недійсне або термін його дії закінчився');
        }
      } catch {
        if (!isMounted) return;
        setTokenError('Помилка перевірки посилання для скидання');
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError('Відсутній токен скидання.');
      return;
    }

    if (newPassword.length < 6) {
      setFormError('Пароль повинен містити щонайменше 6 символів');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Паролі не співпадають');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPasswordAction(token, newPassword);
      if (res.success) {
        // Redirect to /login?reset=success
        router.push('/login?reset=success');
      } else {
        setFormError(res.error || 'Помилка скидання пароля');
      }
    } catch {
      setFormError('Виникла непередбачена помилка. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="mt-3 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Перевірка посилання для скидання пароля...
        </p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Недійсне посилання
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {tokenError}
          </p>
          <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            Посилання для відновлення пароля діє лише 15 хвилин та є одноразовим.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Link
            href="/forgot-password"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <span>Запросити нове посилання</span>
          </Link>
          <Link
            href="/login"
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 py-1"
          >
            Повернутися до входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-3.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span>{formError}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="new-password"
          className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
        >
          Новий пароль
        </label>
        <div className="relative rounded-xl shadow-2xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="new-password"
            type={showNewPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Мінімум 6 символів"
            className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2.5 pl-9.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
        >
          Повторіть новий пароль
        </label>
        <div className="relative rounded-xl shadow-2xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Повторіть пароль"
            className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 py-2.5 pl-9.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-2.5 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <span>Зберегти новий пароль</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Скасувати та повернутися
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-zinc-900 dark:text-zinc-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* App Logo & Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
            Новий пароль
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Введіть новий пароль для доступу до вашого акаунта
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xl border border-zinc-200/80 dark:border-zinc-800">
          <Suspense
            fallback={
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="mt-3 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Завантаження...
                </p>
              </div>
            }
          >
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
