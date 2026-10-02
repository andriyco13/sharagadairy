'use server';

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendTelegramMessage, sendWebPushToSubscription } from '@/lib/notifications';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Revalidation may fail in background or external context
  }
}

/**
 * Saves a browser push subscription for the authenticated user and enables notifyBrowser.
 */
export async function savePushSubscriptionAction(subscriptionData: {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно авторизуватися' };
    }

    if (!subscriptionData?.endpoint || !subscriptionData.keys?.p256dh || !subscriptionData.keys?.auth) {
      return { success: false, error: 'Некоректні дані підписки' };
    }

    // Upsert subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscriptionData.endpoint },
      update: {
        userId: user.id,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
      },
      create: {
        userId: user.id,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
      },
    });

    // Automatically enable browser push for user
    await prisma.user.update({
      where: { id: user.id },
      data: { notifyBrowser: true },
    });

    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return { success: false, error: 'Не вдалося зберегти підписку' };
  }
}

/**
 * Toggles browser notification on or off for the user.
 */
export async function toggleBrowserNotificationAction(enabled: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно авторизуватися' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { notifyBrowser: enabled },
    });

    safeRevalidate('/');
    return { success: true, enabled };
  } catch (error) {
    console.error('Error toggling browser notification:', error);
    return { success: false, error: 'Не вдалося змінити налаштування' };
  }
}

/**
 * Toggles Telegram notification on or off for the user.
 */
export async function toggleTelegramNotificationAction(enabled: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно авторизуватися' };
    }

    if (enabled && !user.telegramChatId) {
      return {
        success: false,
        error: 'Спочатку необхідно підключити Telegram-бота через кнопку «Підключити Telegram».',
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { notifyTelegram: enabled },
    });

    safeRevalidate('/');
    return { success: true, enabled };
  } catch (error) {
    console.error('Error toggling Telegram notification:', error);
    return { success: false, error: 'Не вдалося змінити налаштування Telegram' };
  }
}

/**
 * Generates a unique Telegram auth link (deep link and tg:// URI) for the user to link their Telegram chat.
 */
export async function generateTelegramAuthLinkAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно авторизуватися' };
    }

    const code = 'sh_' + crypto.randomBytes(6).toString('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramAuthCode: code },
    });

    const botUsername = process.env.TELEGRAM_BOT_NAME || 'sharaga_diary_bot';
    const deepLink = `https://t.me/${botUsername}?start=${code}`;
    const tgLink = `tg://resolve?domain=${botUsername}&start=${code}`;

    return {
      success: true,
      code,
      botUsername,
      deepLink,
      tgLink,
    };
  } catch (error) {
    console.error('Error generating Telegram auth link:', error);
    return { success: false, error: 'Не вдалося згенерувати посилання для Telegram' };
  }
}

/**
 * Unlinks the Telegram chat from the user account.
 */
export async function unlinkTelegramAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно авторизуватися' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: null,
        telegramAuthCode: null,
        notifyTelegram: false,
      },
    });

    safeRevalidate('/');
    return { success: true };
  } catch (error) {
    console.error('Error unlinking Telegram:', error);
    return { success: false, error: 'Не вдалося відключити Telegram' };
  }
}

/**
 * Sends test notifications to the user across enabled channels to verify setup.
 */
export async function sendTestNotificationAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Необхідно авторизуватися' };
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { pushSubscriptions: true },
    });

    if (!fullUser) {
      return { success: false, error: 'Користувача не знайдено' };
    }

    let telegramSent = false;
    let pushSent = false;

    // Send test Telegram message
    if (fullUser.telegramChatId) {
      telegramSent = await sendTelegramMessage(
        fullUser.telegramChatId,
        `🔔 <b>Тестове сповіщення від Sharaga!</b>\n\nПривіт, ${fullUser.name}!\nТвій Telegram успішно налаштований. Тепер ти отримуватимеш нагадування про пари за 5 хвилин до початку! 🚀`
      );
    }

    // Send test Web Push
    if (fullUser.pushSubscriptions.length > 0) {
      for (const sub of fullUser.pushSubscriptions) {
        const sent = await sendWebPushToSubscription(sub, {
          title: '🔔 Тестове сповіщення!',
          body: `Привіт, ${fullUser.name}! Браузерні Push-сповіщення працюють на відмінно!`,
          url: '/',
        });
        if (sent) pushSent = true;
      }
    }

    return {
      success: true,
      telegramSent,
      pushSent,
    };
  } catch (error) {
    console.error('Error sending test notification:', error);
    return { success: false, error: 'Помилка надсилання тестового сповіщення' };
  }
}
