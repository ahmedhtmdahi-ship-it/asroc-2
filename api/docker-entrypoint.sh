#!/bin/sh
# نقطة إقلاع الـ API داخل الحاوية:
#   1) طبّق الـ migrations على قاعدة SQLite (تنشئ الجداول لو مش موجودة).
#   2) ازرع البيانات الأولية (السكربت idempotent وبيتخطّى لو فيه بيانات).
#   3) شغّل السيرفر المترجم بـ node بمستخدم non-root.
#
# migrate/seed بيتنفّذوا كـ root (بيكتبوا قاعدة SQLite أول مرة)، وبعدها بنسلّم
# مجلد الداتا لمستخدم node ونشغّل السيرفر الطويل (المتعرّض للشبكة) بصلاحيات أقل.
set -e

cd /app/api

# مجلد الداتا الدائم (قاعدة SQLite + مرفقات) — من docker-compose على volume.
mkdir -p /data/uploads

echo "▶️  تطبيق الـ migrations..."
pnpm exec prisma migrate deploy

echo "▶️  زرع البيانات الأولية (idempotent — بيتخطّى لو فيه بيانات)..."
# الزرع بيرجّع 0 لو الداتا موجودة أصلاً (إعادة التشغيل مأمونة)، فأي فشل هنا فشل حقيقي.
# بنوقف الإقلاع بدل ما السيرفر يقوم بقاعدة فاضية بلا مستخدمين (محدش يقدر يدخل) بصمت.
pnpm exec prisma db seed || {
  echo "❌ فشل الزرع — إيقاف الإقلاع."
  echo "   السبب الأشهر: SEED_ADMIN_PASSWORD غير محدد في الإنتاج. حدّده في .env وأعد التشغيل."
  exit 1
}

# سلّم مجلد الداتا لمستخدم node عشان السيرفر يقدر يكتب فيه بصلاحيات أقل.
chown -R node:node /data

echo "▶️  تشغيل الـ API (node non-root)..."
exec su-exec node node dist/server.mjs
