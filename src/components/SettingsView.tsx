'use client';

import { useState, useTransition, useEffect } from 'react';
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
  Bell,
  Send,
  MessageCircle,
  ExternalLink,
  Copy,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';
import { seedDemoWeekAction } from '@/app/actions';
import { logoutAction } from '@/app/authActions';
import {
  savePushSubscriptionAction,
  toggleBrowserNotificationAction,
  toggleTelegramNotificationAction,
  generateTelegramAuthLinkAction,
  unlinkTelegramAction,
  sendTestNotificationAction,
} from '@/app/notificationActions';
import { getAcademicYearStart, formatDateUk } from '@/lib/dateUtils';

interface SettingsViewProps {
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
  totalSchedules: number;
  currentWeekNumber?: number;
  currentWeekType?: 'ODD' | 'EVEN';
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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

  // Notification States
  const [browserPushEnabled, setBrowserPushEnabled] = useState(user?.notifyBrowser ?? false);
  const [telegramEnabled, setTelegramEnabled] = useState(user?.notifyTelegram ?? false);
  const [telegramLinked, setTelegramLinked] = useState(Boolean(user?.telegramChatId));

  const [isBrowserLoading, setIsBrowserLoading] = useState(false);
  const [isGeneratingTgLink, setIsGeneratingTgLink] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [copiedTgLink, setCopiedTgLink] = useState(false);

  const [notificationFeedback, setNotificationFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [tgAuthModal, setTgAuthModal] = useState<{
    open: boolean;
    deepLink: string;
    tgLink: string;
    code: string;
    botUsername: string;
  } | null>(null);

  // Synchronize initial props
  useEffect(() => {
    setBrowserPushEnabled(user?.notifyBrowser ?? false);
    setTelegramEnabled(user?.notifyTelegram ?? false);
    setTelegramLinked(Boolean(user?.telegramChatId));
  }, [user]);

  const showNotificationFeedback = (type: 'success' | 'error', text: string) => {
    setNotificationFeedback({ type, text });
    setTimeout(() => {
      setNotificationFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

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

  /* =========================================================================
     BROWSER PUSH NOTIFICATION HANDLER
     ========================================================================= */
  const handleToggleBrowserPush = async () => {
    if (browserPushEnabled) {
      // Turn off
      setIsBrowserLoading(true);
      const res = await toggleBrowserNotificationAction(false);
      setIsBrowserLoading(false);
      if (res.success) {
        setBrowserPushEnabled(false);
        showNotificationFeedback('success', 'Браузерні сповіщення вимкнено.');
        router.refresh();
      } else {
        showNotificationFeedback('error', res.error || 'Не вдалося вимкнути сповіщення');
      }
    } else {
      // Turn on
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        showNotificationFeedback('error', 'Ваш браузер не підтримує Web Push сповіщення.');
        return;
      }

      setIsBrowserLoading(true);
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setIsBrowserLoading(false);
          showNotificationFeedback(
            'error',
            'Дозвіл на сповіщення відхилено в браузері. Дозвольте їх у налаштуваннях сайту.'
          );
          return;
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          setIsBrowserLoading(false);
          showNotificationFeedback('error', 'VAPID публічний ключ не налаштовано на сервері.');
          return;
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        }

        const subJson = subscription.toJSON();
        const p256dh = subJson.keys?.p256dh;
        const auth = subJson.keys?.auth;

        if (!p256dh || !auth) {
          setIsBrowserLoading(false);
          showNotificationFeedback('error', 'Не вдалося згенерувати ключі підписки браузера.');
          return;
        }

        const res = await savePushSubscriptionAction({
          endpoint: subscription.endpoint,
          keys: { p256dh, auth },
        });

        setIsBrowserLoading(false);

        if (res.success) {
          setBrowserPushEnabled(true);
          showNotificationFeedback('success', 'Браузерні Push-сповіщення успішно активовано!');
          router.refresh();
        } else {
          showNotificationFeedback('error', res.error || 'Помилка збереження підписки на сервері.');
        }
      } catch (err: any) {
        setIsBrowserLoading(false);
        console.error('Error enabling Web Push:', err);
        showNotificationFeedback('error', err?.message || 'Помилка реєстрації Web Push.');
      }
    }
  };

  /* =========================================================================
     TELEGRAM NOTIFICATION HANDLER
     ========================================================================= */
  const handleToggleTelegram = async () => {
    if (!telegramLinked) {
      handleOpenTelegramModal();
      return;
    }

    const nextVal = !telegramEnabled;
    setTelegramEnabled(nextVal);
    const res = await toggleTelegramNotificationAction(nextVal);
    if (res.success) {
      showNotificationFeedback(
        'success',
        nextVal ? 'Сповіщення в Telegram активовано!' : 'Сповіщення в Telegram призупинено.'
      );
      router.refresh();
    } else {
      setTelegramEnabled(!nextVal);
      showNotificationFeedback('error', res.error || 'Не вдалося змінити статус Telegram.');
    }
  };

  const handleOpenTelegramModal = async () => {
    setIsGeneratingTgLink(true);
    const res = await generateTelegramAuthLinkAction();
    setIsGeneratingTgLink(false);

    if (res.success && res.deepLink && res.code) {
      setTgAuthModal({
        open: true,
        deepLink: res.deepLink,
        tgLink: res.tgLink || res.deepLink,
        code: res.code,
        botUsername: res.botUsername || 'sharaga_diary_bot',
      });
    } else {
      showNotificationFeedback('error', res.error || 'Не вдалося згенерувати посилання Telegram');
    }
  };

  const handleCopyTgLink = () => {
    if (!tgAuthModal?.deepLink) return;
    navigator.clipboard.writeText(tgAuthModal.deepLink);
    setCopiedTgLink(true);
    setTimeout(() => setCopiedTgLink(false), 2500);
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm('Ви дійсно бажаєте відключити Telegram від свого акаунта?')) return;
    const res = await unlinkTelegramAction();
    if (res.success) {
      setTelegramLinked(false);
      setTelegramEnabled(false);
      showNotificationFeedback('success', 'Telegram успішно відключено.');
      router.refresh();
    } else {
      showNotificationFeedback('error', res.error || 'Помилка відключення Telegram');
    }
  };

  /* =========================================================================
     TEST NOTIFICATION
     ========================================================================= */
  const handleSendTestNotification = async () => {
    setIsTestingNotification(true);
    const res = await sendTestNotificationAction();
    setIsTestingNotification(false);

    if (res.success) {
      const parts = [];
      if (res.telegramSent) parts.push('Telegram');
      if (res.pushSent) parts.push('Браузер');

      if (parts.length > 0) {
        showNotificationFeedback('success', `Тестове сповіщення надіслано в ${parts.join(' та ')}!`);
      } else {
        showNotificationFeedback(
          'error',
          'Сповіщення не надіслано. Перевірте, чи підключено Telegram або активні Push-сповіщення.'
        );
      }
    } else {
      showNotificationFeedback('error', res.error || 'Помилка надсилання тестового сповіщення');
    }
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Users className="w-3 h-3" />
                Група: {user?.group?.name || 'Без групи'}
              </span>

              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  <ShieldCheck className="w-3 h-3" />
                  Адміністратор
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          NOTIFICATIONS SECTION (Web Push & Telegram)
          ===================================================================== */}
      <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" />
              <span>Сповіщення про пари</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Нагадування надходять рівно за 5 хвилин до початку пари з аудиторією та викладачем
            </p>
          </div>

          {(browserPushEnabled || telegramLinked) && (
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={isTestingNotification}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer self-start sm:self-auto"
            >
              {isTestingNotification ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span>Тестове сповіщення</span>
            </button>
          )}
        </div>

        {/* Feedback Alert */}
        {notificationFeedback && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
              notificationFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {notificationFeedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{notificationFeedback.text}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Channel 1: Browser Web Push */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Браузерні Push-сповіщення
                  </h4>
                  {browserPushEnabled && (
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      Активно
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-md">
                  Спливаючі сповіщення у вашому браузері навіть коли вкладка згорнута (через Service Worker).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                type="button"
                onClick={handleToggleBrowserPush}
                disabled={isBrowserLoading}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  browserPushEnabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
                role="switch"
                aria-checked={browserPushEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    browserPushEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Channel 2: Telegram Notifications */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 mt-0.5">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Сповіщення в Telegram
                  </h4>
                  {telegramLinked ? (
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      Чат підключено
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      Не підключено
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-md">
                  Миттєві нагадування у ваш Telegram через офіційного бота за 5 хвилин до початку кожної пари.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {telegramLinked ? (
                <>
                  <button
                    type="button"
                    onClick={handleUnlinkTelegram}
                    className="text-xs font-semibold text-zinc-400 hover:text-rose-600 transition-colors mr-2 cursor-pointer"
                  >
                    Відключити
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleTelegram}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      telegramEnabled ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                    role="switch"
                    aria-checked={telegramEnabled}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        telegramEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenTelegramModal}
                  disabled={isGeneratingTgLink}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  {isGeneratingTgLink ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Підключити бота</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TELEGRAM AUTH MODAL
          ===================================================================== */}
      {tgAuthModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" />
                <span>Підключення Telegram-бота</span>
              </h3>
              <button
                type="button"
                onClick={() => setTgAuthModal(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Щоб привʼязати акаунт, перейдіть до бота в Telegram і натисніть кнопку{' '}
                <strong>«Start» (Розпочати)</strong>:
              </p>

              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 p-4 border border-zinc-200/80 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-500 uppercase tracking-wider">Бот</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    @{tgAuthModal.botUsername}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-500 uppercase tracking-wider">Код зв'язку</span>
                  <code className="rounded-md bg-zinc-200/80 dark:bg-zinc-700 px-2 py-0.5 font-mono text-zinc-800 dark:text-zinc-200 font-bold">
                    {tgAuthModal.code}
                  </code>
                </div>

                <div className="pt-1">
                  <a
                    href={tgAuthModal.deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 p-2.5 text-xs font-bold text-white shadow-xs transition-colors"
                  >
                    <span>Відкрити бота в Telegram</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Copy link alternate */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={tgAuthModal.deepLink}
                  className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-500 font-mono select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyTgLink}
                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  {copiedTgLink ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Скопійовано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копіювати</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-400">Натисніть Start у боті</span>
              <button
                type="button"
                onClick={() => {
                  setTgAuthModal(null);
                  router.refresh();
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Готово / Оновити</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
          вересня, календарна привʼязка домашніх завдань (UserTask) до дати заняття, нагадування про
          пари за 5 хвилин через Web Push і Telegram, та журнал успішності.
        </p>
      </div>
    </div>
  );
}
