import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// قبل كل تشغيلة e2e: نظّف بيانات مسار الطلبات في قاعدة الـ API عشان الاختبارات
// تبدأ من حالة معروفة. بننفّذ السكربت جوه workspace الـ API لأن @prisma/client
// و DATABASE_URL (من api/.env) بيتحلّوا هناك. لو القاعدة لسه مش متهيّأة منمنعش
// التشغيل — الاختبارات نفسها هتفشل بوضوح لو الداتا ناقصة.
export default function globalSetup() {
  const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "api");
  try {
    execSync("node scripts/reset-workflow.mjs", { cwd: apiDir, stdio: "inherit" });
  } catch (err) {
    console.warn("⚠️  reset-workflow فشل (هل القاعدة متهيّأة؟) — بنكمّل والاختبارات هتكشف أي نقص.");
    console.warn(err instanceof Error ? err.message : String(err));
  }
}
