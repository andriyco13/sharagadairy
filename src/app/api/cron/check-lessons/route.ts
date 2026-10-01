import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWeekNumberAndType } from '@/lib/dateUtils';
import { sendTelegramMessage, sendWebPushToSubscription } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function GET(req: NextRequest) {
  try {
    // 1. Authorization check
    const authHeader = req.headers.get('authorization');
    const secretParam = req.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    const isAuthorized =
      (cronSecret && (authHeader === `Bearer ${cronSecret}` || secretParam === cronSecret)) ||
      process.env.NODE_ENV === 'development';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Compute current Kyiv Date and Time
    const now = new Date();
    // Convert to Kyiv time representation
    const kyivTimeString = now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' });
    const kyivDate = new Date(kyivTimeString);

    const dayOfWeek = kyivDate.getDay(); // 0 is Sun, 1 is Mon ... 5 is Fri, 6 is Sat
    if (dayOfWeek < 1 || dayOfWeek > 5) {
      return NextResponse.json({
        message: 'Weekend: no classes today',
        dayOfWeek,
        processed: 0,
      });
    }

    // Calculate current week parity (ODD/EVEN)
    const { weekType, weekNumber } = getWeekNumberAndType(kyivDate);

    // Calculate target lesson start time (5 minutes from now in Europe/Kyiv)
    const minutesParam = Number(req.nextUrl.searchParams.get('minutes')) || 5;
    const targetDate = new Date(kyivDate.getTime() + minutesParam * 60 * 1000);
    const targetHours = String(targetDate.getHours()).padStart(2, '0');
    const targetMinutes = String(targetDate.getMinutes()).padStart(2, '0');
    const defaultTargetTime = `${targetHours}:${targetMinutes}`;

    // Optional override for testing via query parameter (e.g. ?time=08:20)
    const queryTime = req.nextUrl.searchParams.get('time');
    const targetTime = queryTime || defaultTargetTime;

    // 3. Find schedules starting at targetTime on this day of week matching parity
    const schedules = await prisma.schedule.findMany({
      where: {
        dayOfWeek,
        startTime: targetTime,
        weekType: {
          in: ['ALL', weekType],
        },
      },
      include: {
        subject: true,
        group: true,
      },
    });

    if (schedules.length === 0) {
      return NextResponse.json({
        message: 'No lessons starting in ' + minutesParam + ' minutes',
        targetTime,
        dayOfWeek,
        weekType,
        weekNumber,
        processedLessons: 0,
      });
    }

    let totalTelegramsSent = 0;
    let totalPushesSent = 0;
    const details = [];

    // 4. For each matching schedule, notify enrolled students with active notifications
    for (const schedule of schedules) {
      const lessonTypeUa = schedule.lessonType === 'LECTURE' ? 'Лекція' : 'Практика';
      const subjectName = schedule.subject.name;
      const teacher =
        schedule.teacher ||
        (schedule.lessonType === 'LECTURE'
          ? schedule.subject.lecturer
          : schedule.subject.practitioner) ||
        'Не вказано';
      const room = schedule.room || 'Дистанційно';

      // Telegram message (HTML formatted)
      const tgMessage = `⏳ <b>Через ${minutesParam} хвилин починається пара!</b>\n\n📚 <b>Дисципліна:</b> ${escapeHtml(
        subjectName
      )} (${lessonTypeUa})\n👨‍🏫 <b>Викладач:</b> ${escapeHtml(teacher)}\n🚪 <b>Аудиторія:</b> ${escapeHtml(
        room
      )}\n⏰ <b>Час:</b> ${schedule.startTime} – ${schedule.endTime}`;

      // Web Push payload
      const pushPayload = {
        title: `⏳ Через ${minutesParam} хвилин пара!`,
        body: `📚 ${subjectName} (${lessonTypeUa})\n👨‍🏫 ${teacher}\n🚪 ${room}`,
        url: '/',
      };

      // Find active students in this group
      const students = await prisma.user.findMany({
        where: {
          groupId: schedule.groupId,
          OR: [
            { notifyBrowser: true },
            { notifyTelegram: true, telegramChatId: { not: null } },
          ],
        },
        include: {
          pushSubscriptions: true,
        },
      });

      let lessonTelegrams = 0;
      let lessonPushes = 0;

      for (const student of students) {
        // Send Telegram notification
        if (student.notifyTelegram && student.telegramChatId) {
          const sent = await sendTelegramMessage(student.telegramChatId, tgMessage);
          if (sent) {
            lessonTelegrams++;
            totalTelegramsSent++;
          }
        }

        // Send Browser Push notifications
        if (student.notifyBrowser && student.pushSubscriptions.length > 0) {
          for (const sub of student.pushSubscriptions) {
            const sent = await sendWebPushToSubscription(sub, pushPayload);
            if (sent) {
              lessonPushes++;
              totalPushesSent++;
            }
          }
        }
      }

      details.push({
        lessonId: schedule.id,
        subject: subjectName,
        group: schedule.group.name,
        telegramsSent: lessonTelegrams,
        pushesSent: lessonPushes,
      });
    }

    return NextResponse.json({
      success: true,
      targetTime,
      dayOfWeek,
      weekType,
      processedLessons: schedules.length,
      totalTelegramsSent,
      totalPushesSent,
      details,
    });
  } catch (error) {
    console.error('Error in lesson check cron:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
