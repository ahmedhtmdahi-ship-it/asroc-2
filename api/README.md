# ASROC API

الـ backend بتاع نظام إدارة الخدمات الطبية.
**Node + TypeScript + Fastify + Prisma + PostgreSQL**

البيانات والـ auth بيشتغلوا كلهم على السيرفر (مش في المتصفح)، فالداتا تتشارك بين كل الأجهزة على شبكة الشركة.

## التشغيل السريع (Docker — الموصى به)

من جذر المشروع:

```bash
docker compose up -d        # يشغّل PostgreSQL + الـ API
curl http://localhost:4000/health/live    # المفروض يرد {"status":"ok"}
curl http://localhost:4000/health/ready   # المفروض يرد {"status":"ok","db":"up"}
```

## التشغيل للتطوير (محلي بدون Docker للـ API)

```bash
# 1) شغّل قاعدة البيانات بس
docker compose up -d db

# 2) جهّز البيئة
cd api
cp .env.example .env
pnpm install
pnpm prisma:generate

# 3) شغّل السيرفر (reload تلقائي)
pnpm dev
```

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `pnpm dev` | تشغيل مع إعادة تحميل تلقائي |
| `pnpm build` | بناء TypeScript → `dist/` |
| `pnpm start` | تشغيل النسخة المبنية |
| `pnpm typecheck` | فحص الأنواع بدون بناء |
| `pnpm prisma:generate` | توليد Prisma Client |
| `pnpm prisma:migrate` | إنشاء/تطبيق migration |
| `pnpm prisma:studio` | واجهة لتصفّح قاعدة البيانات |
| `pnpm db:seed` | زرع البيانات الأولية |

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
- [x] **6b. ربط الـ stores بالـ API** — `requestStore` (create/updateStatus/updateFields/sync)، `medicineStore`، `profilesStore`، `managersStore`، `departmentsStore` كلهم بقوا على الـ API (تحديث محلي متفائل + مزامنة خلفية، نفس الواجهات فمفيش تغيير في الصفحات). API جديد: `PATCH /requests/:id`، `POST /requests` بيقبل id من العميل، `GET /users`، `GET /medicines`.
- [ ] 6c. متبقّي — نقل إدارة المستخدمين في `SuperAdminPage` (لسه على Supabase عبر `lib/api.ts`) لـ API، وحذف ملفات الداتا الضخمة من الـ bundle.
