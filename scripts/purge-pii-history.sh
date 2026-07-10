#!/usr/bin/env bash
# ⚠️ مسح ملفات الـ PII من تاريخ git بالكامل — عملية لا رجعة فيها بعد الـ push.
#
# قبل التشغيل:
#   1. اتأكد إن كل الشغل الحالي متعمل commit و push.
#   2. بلّغ أي حد عنده clone إنه لازم يعمل re-clone بعد العملية.
#   3. pip install git-filter-repo
#
# التشغيل (من جذر الريبو):
#   bash scripts/purge-pii-history.sh
#
# بعد التشغيل:
#   git push --force --all && git push --force --tags
#   ولو الريبو على GitHub وكان فيه PRs قديمة بتعرض الملفات دي،
#   كلّم GitHub Support لمسح الـ cached views.
set -euo pipefail

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "❌ git-filter-repo مش متسطب:  pip install git-filter-repo" >&2
  exit 1
fi

echo "⚠️  هيتمسح من *كل* تاريخ git:"
echo "   - api/prisma/seed-data/users.json (النسخ القديمة بالبيانات الحقيقية)"
echo "   - src/imports/medical-system-brd-v1.pdf"
echo "   - src/imports/WhatsApp_Image_2026-05-18_at_5.18.18_PM.jpeg"
read -r -p "متأكد؟ اكتب yes للاستمرار: " answer
[ "$answer" = "yes" ] || { echo "اتلغت."; exit 1; }

# مهم: النسخة الوهمية الحالية من users.json محفوظة وهترجع بعد المسح.
cp api/prisma/seed-data/users.json /tmp/users-fake-backup.json

git filter-repo --invert-paths \
  --path api/prisma/seed-data/users.json \
  --path src/imports/medical-system-brd-v1.pdf \
  --path "src/imports/WhatsApp_Image_2026-05-18_at_5.18.18_PM.jpeg" \
  --force

# إرجاع النسخة الوهمية (اللي مفيهاش أي PII) كـ commit جديد نضيف.
mkdir -p api/prisma/seed-data
cp /tmp/users-fake-backup.json api/prisma/seed-data/users.json
git add api/prisma/seed-data/users.json
git commit -m "chore(seed): restore synthetic users.json after PII history purge"

echo ""
echo "✅ التاريخ اتنضف محليًا. الخطوة الأخيرة (يدوية عمدًا):"
echo "   git remote add origin <URL>   # filter-repo بيشيل الـ remote للحماية"
echo "   git push --force --all && git push --force --tags"
