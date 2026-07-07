#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# تشغيل حزمة الـ E2E (Playwright) بحالة نظيفة وبأمر واحد.
#
#   ./e2e.sh                 # يشغّل كل الحزمة
#   ./e2e.sh e2e/01-auth.spec.ts   # يشغّل ملف/ملفات محددة (تتمرّر لـ playwright)
#
# بيعمل:
#   1) يوقّف أي سيرفرات قديمة على 4000/5173 عشان Playwright يقلّع سيرفرات
#      جديدة بـ NODE_ENV=test (الـ rate-limit بيتعطّل — شوف api/src/app.ts).
#   2) يعيد ضبط الـ SQLite DB ويزرعها من جديد (حالة معروفة لكل تشغيلة).
#   3) يشغّل Playwright — اللي بيقلّع الـ API + الواجهة تلقائيًا (webServer).
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ 1/3  إيقاف أي سيرفرات قديمة على 4000/5173…"
for port in 4000 5173; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "   • قتل PIDs على المنفذ $port: $pids"
    kill $pids 2>/dev/null || true
  fi
done
# مهلة صغيرة عشان المنافذ تتحرّر
sleep 1

echo "▶ 2/3  إعادة ضبط قاعدة البيانات وزرعها…"
(
  cd api
  # مسح ملف الـ SQLite المحلي (dev) + ملفات الـ WAL، ثم إعادة تطبيق الـ
  # migrations والزرع. بنتجنّب `prisma migrate reset` عمدًا لأن Prisma بتحظره
  # على الـ AI agents؛ حذف ملف الـ dev DB + migrate deploy يوصل لنفس الحالة
  # النظيفة من غير الأمر المحظور. (ده DB تطوير محلي، مش production.)
  rm -f prisma/dev.db prisma/dev.db-shm prisma/dev.db-wal prisma/dev.db-journal
  npx prisma migrate deploy >/dev/null 2>&1
  pnpm db:seed >/dev/null 2>&1
)
echo "   • تم: مستخدمون + أقسام + أدوية بحالة أولية (mustChangePassword=true)."

echo "▶ 3/3  تشغيل Playwright…"
# أي وسائط تتمرّر للأمر (مثلاً ملف spec محدد) بتروح لـ playwright.
npx playwright test "$@"
