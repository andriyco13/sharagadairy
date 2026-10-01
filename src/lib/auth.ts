import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const SESSION_COOKIE_NAME = 'sharaga_session_token';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  } catch {
    // Outside Next.js request context (e.g. testing scripts)
  }

  return token;
}

export async function getCurrentUser(userIdOverride?: string) {
  try {
    if (userIdOverride) {
      return await prisma.user.findUnique({
        where: { id: userIdOverride },
        include: { group: true },
      });
    }

    let token: string | undefined;
    let isNextContext = false;
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      isNextContext = true;
    } catch {
      // Outside Next.js request context
    }

    if (!token) {
      if (isNextContext) {
        return null;
      }
      // Fallback only for non-cookie contexts (tests/scripts)
      const fallbackSession = await prisma.session.findFirst({
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            include: { group: true },
          },
        },
      });
      return fallbackSession?.user || null;
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!session) return null;

    // Check expiration
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function verifyAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      authorized: false as const,
      status: 401,
      error: '401 Unauthorized: Необхідно увійти в систему',
      user: null,
    };
  }

  if (user.role !== 'ADMIN') {
    return {
      authorized: false as const,
      status: 403,
      error: '403 Forbidden: Потрібні права адміністратора',
      user,
    };
  }

  return { authorized: true as const, status: 200, user };
}

export async function requireAdmin() {
  const { authorized, error, user } = await verifyAdmin();
  if (!authorized || !user) {
    throw new Error(error || '403 Forbidden');
  }
  return user;
}

export async function destroySession(): Promise<void> {
  try {
    let token: string | undefined;
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      cookieStore.delete(SESSION_COOKIE_NAME);
    } catch {
      // Outside Next.js request context
    }

    if (token) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }
  } catch (error) {
    console.error('Error destroying session:', error);
  }
}

