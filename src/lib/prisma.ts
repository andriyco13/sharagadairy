import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  schemaVersion?: string;
};

// Increment schemaVersion whenever prisma/schema.prisma changes to force client reload in dev
const CURRENT_SCHEMA_VERSION = 'v4-auth-session';

if (!globalForPrisma.prisma || globalForPrisma.schemaVersion !== CURRENT_SCHEMA_VERSION) {
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect().catch(() => {});
  }
  globalForPrisma.prisma = new PrismaClient();
  globalForPrisma.schemaVersion = CURRENT_SCHEMA_VERSION;
}

export const prisma = globalForPrisma.prisma;
