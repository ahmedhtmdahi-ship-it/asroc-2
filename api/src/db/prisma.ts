import { PrismaClient } from "@prisma/client";

/**
 * نسخة واحدة من Prisma Client لكل التطبيق (singleton).
 * كل الـ modules بتستورد منها بدل ما كل واحد يفتح اتصال لوحده.
 */
export const prisma = new PrismaClient();
