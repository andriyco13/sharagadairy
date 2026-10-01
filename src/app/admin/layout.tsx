import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, GraduationCap, LogOut } from 'lucide-react';
import { logoutAction } from '@/app/authActions';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-30 border-b border-purple-200/80 dark:border-purple-900/50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs hover:bg-purple-700 transition-colors"
              title="На головну"
            >
              <ShieldCheck className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Шарага Diary
                </span>
                <span className="rounded-md bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                  Адмін-панель
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Керування групами, дисциплінами та розкладом занять
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/70 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Переглянути як студент</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </span>
              </div>

              <form
                action={async () => {
                  'use server';
                  await logoutAction();
                  redirect('/login');
                }}
              >
                <button
                  type="submit"
                  title="Вийти з акаунта"
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:border-rose-900/60 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Вийти</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
