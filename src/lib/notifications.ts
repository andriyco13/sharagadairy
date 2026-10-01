import webpush from 'web-push';
import { prisma } from './prisma';

// Initialize Web Push VAPID configuration
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@sharaga.ua';
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error('Failed to configure web-push VAPID details:', err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a Web Push notification to a given PushSubscription record.
 * Automatically cleans up invalid / expired subscriptions (HTTP 410 or 404).
 */
export async function sendWebPushToSubscription(
  subscription: {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushPayload
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification');
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (error: any) {
    console.error(`Error sending push to subscription ${subscription.id}:`, error?.statusCode || error?.message);

    // If subscription is expired or unregistered, remove it from the DB
    if (error?.statusCode === 410 || error?.statusCode === 404) {
      console.log(`Cleaning up expired push subscription ${subscription.id}`);
      await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
    }

    return false;
  }
}

/**
 * Sends a message to a Telegram chat using Telegram Bot API.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not configured, skipping Telegram message');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram API error:', data.description);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}
