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
- [ ] 2. Schema — تحويل الأنواع الحالية لجداول Prisma
- [ ] 3. Seed — زرع الـ 1750 مستخدم من ملفات الداتا الحالية
- [ ] 4. Auth API — `/login` بـ JWT + bcrypt على السيرفر
- [ ] 5. CRUD APIs — requests / approvals / clinical / pharmacy ...
- [ ] 6. ربط الـ frontend — استبدال Supabase client بـ `apiClient`
