#!/bin/sh
# نقطة إقلاع الـ API داخل الحاوية:
#   1) طبّق الـ migrations على قاعدة SQLite (تنشئ الجداول لو مش موجودة).
#   2) ازرع البيانات الأولية (السكربت idempotent وبيتخطّى لو فيه بيانات).
#   3) شغّل السيرفر.
set -e

cd /app/api

echo "▶️  تطبيق الـ migrations..."
pnpm exec prisma migrate deploy

echo "▶️  زرع البيانات الأولية (لو لزم)..."
pnpm exec prisma db seed || echo "⚠️  تخطّي الزرع (أو فشل غير حرج) — يكمّل التشغيل."

echo "▶️  تشغيل الـ API..."
exec pnpm exec tsx src/server.ts
