import bcrypt from "bcryptjs";

import { prisma } from "../../db/prisma.js";

// hash وهمي ثابت (يُحسب مرة عند الإقلاع) عشان نعمل bcrypt.compare حتى لو المستخدم
// مش موجود/غير نشط — بيوحّد زمن الرد ويمنع تخمين أسماء المستخدمين (timing enumeration).
const DUMMY_HASH = bcrypt.hashSync("unused-placeholder-password", 10);

/**
 * يتحقق من بيانات الدخول مقابل قاعدة البيانات.
 * المقارنة بـ bcrypt على السيرفر — النص الصريح لا يخرج من هنا أبدًا.
 * بيرجّع المستخدم لو صح، أو null لو غلط/غير نشط.
 */
export async function verifyCredentials(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.isActive) {
    // نعمل compare وهمي بنفس التكلفة عشان الزمن ما يفرّقش بين "مش موجود" و"باسورد غلط".
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return user;
}
