# ملف التسليم — ASROC (نظام إدارة الخدمات الطبية)

الملف ده بيلخّص اللي اتعمل عشان تكمّل عليه بسهولة (سواء بنفسك أو عبر Claude في VS Code).

---

## 🎯 الفكرة باختصار

حوّلنا التخزين والمصادقة من **Supabase (سحابة/إنترنت)** إلى
**backend يشتغل على سيرفر الشركة** — عشان الداتا تعيش جوه شبكة الشركة
وتتشارك بين كل الأجهزة، من غير اعتماد على نت عالمي.

**الـ Stack:** React (الواجهة القديمة) + **Node + TypeScript + Fastify + Prisma + PostgreSQL** (backend جديد) + Docker.

---

## 🧱 المعمارية: قبل / بعد

| قبل | بعد |
|---|---|
| Supabase cloud | PostgreSQL على سيرفر الشركة |
| auth في المتصفح | JWT + bcrypt على السيرفر |
| stores بتكلّم Supabase | stores بتكلّم `/api` (نفس الواجهة) |
| باسورد plaintext | bcrypt hash |

---

## 📂 اللي اتضاف

```
api/                         ← الـ backend الجديد
├── prisma/
│   ├── schema.prisma        ← كل الجداول
│   └── seed.ts              ← زرع 1755 مستخدم + 35 قسم + 19343 دواء (bcrypt)
├── src/
│   ├── server.ts / app.ts   ← الإقلاع وتسجيل الـ modules
│   ├── env.ts               ← تحقق متغيّرات البيئة (zod)
│   ├── db/prisma.ts         ← اتصال DB
│   ├── plugins/jwt.ts       ← JWT + authenticate
│   ├── middleware/          ← requirePermission + معالج أخطاء
│   └── modules/
│       ├── auth/            ← POST /auth/login , GET /auth/me
│       ├── requests/        ← CRUD + workflow (statusFlow)
│       ├── users/           ← GET /users?roles=
│       ├── medicines/       ← GET /medicines
│       └── health/          ← /health/live , /health/ready
├── Dockerfile
└── README.md               ← تفاصيل + خريطة المراحل

docker-compose.yml           ← Postgres + API بأمر واحد
.env.example                 ← متغيّرات الواجهة (VITE_API_URL)

src/app/lib/
├── apiClient.ts             ← fetch wrapper + JWT
├── authApi.ts               ← login/me + mapper
├── requestsApi.ts           ← list/get/create/transition/patch
└── dataApi.ts               ← listUsers / listMedicines
```

## ✏️ اللي اتعدّل في الواجهة

- `src/app/features/auth/AuthContext.tsx` — login/session عبر الـ API بالـ JWT.
- `src/app/store/requestStore.ts` — create/updateStatus/updateFields/sync → API.
- `src/app/store/{medicineStore,profilesStore,managersStore,departmentsStore}.ts` — sync → API.

> **مهم:** واجهات الـ stores زي ما هي (متزامنة) — **مفيش صفحة اتغيّرت**. التبديل جوه الـ store بس.

---

## 🌐 الـ API endpoints

| Method | Path | الوظيفة | الحماية |
|---|---|---|---|
| POST | `/auth/login` | تسجيل دخول → JWT | — |
| GET | `/auth/me` | المستخدم الحالي | JWT |
| GET | `/requests?employeeId=&status=` | قائمة | JWT |
| GET | `/requests/:id` | تفاصيل | JWT |
| POST | `/requests` | إنشاء (بيقبل id من العميل) | `create_request` |
| PATCH | `/requests/:id` | تحديث حقول/روشتة/إحالة | JWT |
| POST | `/requests/:id/transition` | نقل الحالة | صلاحية حسب التحويل |
| GET | `/users?roles=manager,office_manager` | المستخدمون | JWT |
| GET | `/medicines` | الأدوية | JWT |

---

## ▶️ التشغيل محليًا (أول مرة)

```bash
# 1) قاعدة البيانات + الـ backend
docker compose up -d db
cd api
cp .env.example .env
pnpm install
pnpm prisma migrate dev --name init   # يبني الجداول + يشغّل الـ seed
pnpm dev                               # API على http://localhost:4000

# 2) الواجهة (terminal تاني، من جذر المشروع)
cp .env.example .env.local
pnpm install
pnpm dev

# تسجيل الدخول: admin / admin
```

تأكد سريع:
```bash
curl http://localhost:4000/health/ready       # {"status":"ok","db":"up"}
curl -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'
```

---

## ✅ خلص / ⬜ متبقّي

- [x] Backend كامل (schema + seed + auth + requests + users + medicines)
- [x] الواجهة: auth + stores (requests/medicines/profiles/managers/departments) على الـ API
- [ ] **6c:** إدارة المستخدمين في `SuperAdminPage` لسه على Supabase (عبر `src/app/lib/api.ts`) → تتنقل لـ API (محتاج endpoints: إنشاء/تعديل مستخدم + تعديل صلاحيات/دور)
- [ ] **6c:** حذف ملفات الداتا الضخمة (`src/app/data/mockUsers.ts` ~35k سطر، `medicinesSeed.ts`) من الـ bundle بعد ما بقت في الـ DB
- [ ] **الداش بورد الموحدة:** الموظف = الأساس، وكل رول يزيد ميزته (composition by permission)

---

## ⚠️ ملاحظات مهمة قبل ما تكمّل

1. **`pnpm prisma generate`** لازم يتنفّذ على جهازك (اتعمل تلقائيًا مع `migrate`). من غيره الـ typecheck هيشتكي من `PrismaClient` — ده طبيعي.
2. النظام **on-prem بقصد** — متضفش خدمات cloud تخزّن الداتا بره الشركة.
3. الـ backend بيولّد الـ audit/notification/security logs. الواجهة لسه بتكتب نسخ محلية كمان (للعرض الفوري) — تنظيفها جزء من جولة لاحقة.
4. متغيّرات Supabase القديمة لسه مستخدمة في `SuperAdminPage` بس، لحد ما 6c تخلص.

---

## 🤖 برومبت جاهز تديه لـ Claude في VS Code

> اقرأ `HANDOFF.md` و `api/README.md`. المشروع نظام طبي on-prem، الـ backend في `api/`
> (Fastify + Prisma + Postgres) والواجهة React في `src/`. عايز أكمّل من نقطة "المتبقّي":
> [اكتب المهمة، مثلًا: نقل إدارة المستخدمين في SuperAdminPage من Supabase للـ API].
> حافظ على نفس نمط الـ modules في `api/src/modules/` ونمط الـ stores في `src/app/store/`.
