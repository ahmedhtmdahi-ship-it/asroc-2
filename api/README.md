# ASROC API

الـ backend بتاع نظام إدارة الخدمات الطبية.
**Node + TypeScript + Fastify + Prisma + SQLite**

البيانات والـ auth بيشتغلوا كلهم على السيرفر (مش في المتصفح)، فالداتا تتشارك بين كل الأجهزة على شبكة الشركة.
قاعدة البيانات SQLite (ملف واحد على volume دائم) — مناسبة لنشر on-prem على سيرفر واحد.

## التشغيل السريع (Docker — الموصى به)

من جذر المشروع (بيشغّل الواجهة + الـ API معًا):

```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env   # سر قوي (السيرفر بيرفض الافتراضي)
docker compose up -d
# الواجهة على http://<server-ip>/  والـ API خلفها عبر /api
curl http://localhost/api/health/ready   # المفروض يرد {"status":"ok","db":"up"}
```

الـ entrypoint بيطبّق الـ migrations ويزرع البيانات أول مرة تلقائيًا (idempotent).

## التشغيل للتطوير (محلي بدون Docker)

```bash
cd api
cp .env.example .env                 # فيه DATABASE_URL=file:./dev.db + JWT_SECRET للتطوير
pnpm install
pnpm prisma:generate
pnpm prisma migrate dev              # يبني الجداول
pnpm db:seed                         # يزرع المستخدمين/الأقسام/الأدوية
pnpm dev                             # API على http://localhost:4000 (reload تلقائي)
```

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `pnpm dev` | تشغيل مع إعادة تحميل تلقائي |
| `pnpm build` | بناء TypeScript → `dist/` |
| `pnpm start` | تشغيل النسخة المبنية |
| `pnpm typecheck` | فحص الأنواع بدون بناء |
| `pnpm test` | اختبارات التكامل (auth/صلاحيات/workflow) |
| `pnpm prisma:generate` | توليد Prisma Client |
| `pnpm prisma:migrate` | إنشاء/تطبيق migration (تطوير) |
| `pnpm prisma:studio` | واجهة لتصفّح قاعدة البيانات |
| `pnpm db:seed` | زرع البيانات الأولية (من `prisma/seed-data/*.json`) |

## البنية

```
api/
├── prisma/
│   ├── schema.prisma     ← كل الجداول في مكان واحد
│   └── seed.ts           ← (المرحلة الجاية) زرع الـ 1750 مستخدم
└── src/
    ├── server.ts         ← نقطة الدخول
    ├── app.ts            ← بناء التطبيق وتسجيل الـ modules
    ├── env.ts            ← التحقق من متغيّرات البيئة
    ├── db/prisma.ts      ← اتصال قاعدة البيانات (singleton)
    ├── middleware/       ← معالجة الأخطاء، حراسة الـ auth (لاحقًا)
    └── modules/          ← كل feature لوحده (route + service + schema)
        └── health/
```

## خريطة المراحل

- [x] **1. Scaffold** — Fastify + Prisma + Docker + فحص صحة
- [x] **2. Schema** — كل الجداول في `prisma/schema.prisma` (users, medical_requests + كياناتها التابعة، departments, medicines, audit/security logs, notifications)
- [x] **3. Seed** — `prisma/seed.ts` يزرع 1755 مستخدم (bcrypt) + 35 قسم + 19343 دواء من ملفات الداتا الحالية. آمن لإعادة التشغيل (upsert).
- [x] **4. Auth API** — `POST /auth/login` (bcrypt + JWT على السيرفر) و `GET /auth/me`، مع `authenticate` و `requirePermission()` لحماية باقي الـ routes.
- [x] **5. Requests API** — `GET /requests`، `GET /requests/:id`، `POST /requests`، `POST /requests/:id/transition` بنفس الـ workflow + timeline/audit/notification/security logs، محمية بالصلاحيات.
- [x] **6. ربط الـ frontend (auth)** — `src/app/lib/apiClient.ts` + `authApi.ts`، والـ `AuthContext` بقى بيعمل login/session عبر الـ API بالـ JWT (مش Supabase).
- [x] **6b. ربط الـ stores بالـ API** — `requestStore`، `medicineStore`، `profilesStore`، `managersStore`، `departmentsStore` كلهم على الـ API. API: `PATCH /requests/:id`، `POST /requests`، `GET /users`، `GET /medicines`.
- [x] **6c. إدارة المستخدمين + التنظيف** — `SuperAdminPage` بقى على `/users` (CRUD + الدور/الصلاحيات) بدل Supabase؛ ملفات الداتا الضخمة اتشالت من الـ frontend وبقت JSON للـ seed في `prisma/seed-data/`.
- [x] **7. جاهزية النشر** — SQLite + `docker compose` (web + api)، migrate/seed تلقائي عند الإقلاع، تقديم الواجهة عبر nginx (بروكسي `/api`).
- [x] **8. تصليحات الأمان/الـ workflow** — قصر الطلبات على صاحبها (منع IDOR)، تحويلات atomic، قفل الهوية عند الإنشاء، إجبار تغيير الباسورد أول دخول، kill switch عند تعطيل الحساب، rate limit على الدخول، تثبيت HS256.
- [x] **9. اختبارات + CI** — اختبارات تكامل للـ API + GitHub Actions (typecheck + build + tests).
