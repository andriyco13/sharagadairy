import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    const message = update?.message;
    if (!message || !message.chat || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    // Check for /start [code]
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/);
      const code = parts[1]?.trim();

      if (code) {
        // Find user by auth code
        const user = await prisma.user.findFirst({
          where: { telegramAuthCode: code },
        });

        if (user) {
          // Link account and enable Telegram notifications
          await prisma.user.update({
            where: { id: user.id },
            data: {
              telegramChatId: chatId,
              telegramAuthCode: null, // Consume code
              notifyTelegram: true,
            },
          });

          await sendTelegramMessage(
            chatId,
            `🎉 <b>Привіт, ${user.name}!</b>\n\nТвій Telegram успішно підключено до <b>Шарага Diary</b>.\n\n🔔 <b>Що далі:</b>\nТи автоматично отримуватимеш нагадування про пари за 5 хвилин до дзвінка з повною інформацією про аудиторію та викладача.\n\nБажаємо легких сесій та продуктивних пар! 🎓`
          );

          return NextResponse.json({ ok: true, status: 'linked', userId: user.id });
        } else {
          await sendTelegramMessage(
            chatId,
            `⚠️ <b>Код авторизації недійсний або застарілий.</b>\n\nБудь ласка, відкрийте <b>Шарага Diary</b> у розділі «Налаштування» та знову натисніть кнопку «Підключити Telegram».`
          );
          return NextResponse.json({ ok: true, status: 'invalid_code' });
        }
      } else {
        // Plain /start without code
        const existingUser = await prisma.user.findFirst({
          where: { telegramChatId: chatId },
        });

        if (existingUser) {
          await sendTelegramMessage(
            chatId,
            `🎓 <b>Привіт, ${existingUser.name}!</b>\n\nТвій акаунт уже підключений до сповіщень <b>Шарага Diary</b>.\nСповіщення активні: ${existingUser.notifyTelegram ? '✅ Так' : '❌ Ні (можна увімкнути на сайті)'}.`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `👋 <b>Привіт!</b>\n\nЦе офіційний бот <b>Шарага Diary</b> для нагадування про пари за 5 хвилин до початку.\n\nЩоб зв'язати свій акаунт, перейдіть на сайт у <b>Налаштування</b> та натисніть кнопку <b>«Підключити Telegram»</b>.`
          );
        }

        return NextResponse.json({ ok: true });
      }
    }

    // Optional /stop command to disable notifications
    if (text === '/stop') {
      const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { notifyTelegram: false },
        });

        await sendTelegramMessage(
          chatId,
          `🔕 <b>Сповіщення вимкнено.</b>\n\nВи більше не отримуватимете повідомлення про пари. Ви завжди можете увімкнути їх знову у налаштуваннях сайту або надіславши команду /start.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    return NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Sharaga Diary Telegram Webhook',
  });
}
