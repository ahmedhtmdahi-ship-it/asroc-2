import bcrypt from "bcryptjs";

import { prisma } from "../../db/prisma.js";

/**
 * يتحقق من بيانات الدخول مقابل قاعدة البيانات.
 * المقارنة بـ bcrypt على السيرفر — النص الصريح لا يخرج من هنا أبدًا.
 * بيرجّع المستخدم لو صح، أو null لو غلط/غير نشط.
 */
export async function verifyCredentials(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return user;
}
