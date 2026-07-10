# خطة إصلاح ASROC v2 — من مشروع لـ Product

> مرجع: تقرير المراجعة الشاملة (9 يوليو 2026، commit `b68c46e6`).
> هذا الملف هو مصدر الحقيقة للتنفيذ — لو انقطعت أي جلسة، نكمل من هنا.
> علّم ✅ على كل مهمة عند إنجازها **مع رقم الـ commit**.

## ⬅️ حالة التنفيذ (آخر تحديث: 10 يوليو 2026 — branch: fix/track-a-critical)

**المسار A كله متنفذ في الـ working tree** — مش متعمل commit بعد:

- ✅ **A1**: `users.json` وهمي بالكامل (1,755) عبر `scripts/generate-fake-seed.mjs` + `test-users.json` (8 حسابات، باسورد `Test@1234`، بتتزرع خارج production بس) + `seed.ts` بيولّد باسوردات عشوائية لـ CSV خارج git + `SEED_ADMIN_PASSWORD` إلزامي في production
- ✅ **A2**: `/users/lookup` من غير nationalId/phone (+ بيرجع permissions) + أنواع الفرونت اتظبطت + `monthlyTreatmentResolver` بقى بالصلاحية بدل اسم «روبير»
- ✅ **A3**: قاعدة «طلب مفتوح واحد» (409) + «حد 3 كشوفات/شهر» (400) جوه transaction في `createRequest` — الحد من `packages/shared/src/policy.ts`
- ✅ **A4**: سياسة باسورد (8+ حرف ورقم) في `shared/policy.ts` مطبقة على إنشاء المستخدم وتغيير الباسورد
- ✅ **A5**: الـ id من السيرفر (uuid) — الـ schema بترفضه من العميل، و`requestStore` بيستخدم `tmp-` id مؤقت
- ✅ **A6**: الـ audit hook بيسجل userName وبيستثني `/requests` (الـ service بيسجلها domain-level)
- ✅ **A7**: `GET /departments` جديد + `departmentsStore` بيقرأ منه (إصلاح bug اسم المدير/القسم اللي كان مقفل طلب الكشف العادي)
- ✅ **A8**: مرفقات حقيقية — `@fastify/multipart` + فحص magic bytes (PNG/JPG/PDF) + حد 5MB + تنزيل بقيود الوصول + الفرونت بيرفع بعد الحفظ (`requestStore.create(request, files)`)
- ✅ **A9**: `src/imports` اتشالت من الـ tree، اللوجو بقى PNG حقيقي (+ favicon)، `package-lock.json` اتشال، `tree.txt` اتمسحوا
- ✅ **Tests**: 18/18 passing — منهم 7 جداد بيغطوا A3/A4/A5/A7/A8
- ⏳ **باقي**: زرع تجريبي نهائي، commits، وتشغيل `scripts/purge-pii-history.sh` (مسح التاريخ — **محتاج موافقة صريحة قبل الـ force push**)

⚠️ **مهمة داتا للمستخدم**: 18 من 35 قسم في `departments.json` من غير `managerFinancialNumber` — موظفينهم مش هيلاقوا مدير. كمّل الأرقام في الملف.

---

## المبدأ الحاكم

1. **القاعدة تتطبق على السيرفر، والـ client مجرد UX.** أي فحص أعمال (حدود، صلاحيات، حالات) لازم يعيش في `api/` أولاً.
2. **الكود الميت اللي له وظيفة حقيقية → يتفعّل ويتكمل.** اللي يتشال فقط: (أ) التكرار الصريح، (ب) اللي يستحيل إحياؤه لأنه بيكلم بنية اتشالت (Supabase).
3. **مساران متوازيان بحدود ملفات صارمة** لتجنب الـ conflicts:
   - **المسار A (الكوارث):** كل ما تحت `api/`، `scripts/`، `prisma/`، `.gitignore`، تاريخ git، وملفَي `src/app/store/departmentsStore.ts` + `src/app/store/requestStore.ts` (سطور الـ id فقط).
   - **المسار B (الباقي):** كل ما تحت `src/` (عدا الملفين أعلاه)، `e2e/`، `package.json` الجذر.
   - كل مسار يشتغل على branch منفصل من `main`، والدمج بالترتيب: A أولاً ثم B يعمل rebase.

---

# المسار A — الكوارث (بالترتيب، لا تتخطى خطوة)

## A1 — تطهير بيانات الموظفين الحقيقية من git ⛔ الأهم

**المشكلة:** `api/prisma/seed-data/users.json` فيه 1,749 موظف حقيقي: أرقام قومية، تليفونات، وباسوردات نصية بصيغة «الاسم + الرقم المالي». و`e2e/helpers/auth.ts` بيستخدم نفس الأشخاص.

**التنفيذ:**

1. **ولّد بيانات وهمية أولاً** (قبل أي مسح): اكتب `scripts/generate-fake-seed.mjs` يقرأ users.json الحالي ويستبدل:
   - الاسم → أسماء عربية مولّدة من قوائم (اسم أول × 40 + أب × 40 + جد × 40).
   - الرقم القومي → `3YYMMDD` + 8 أرقام عشوائية (صيغة صحيحة، شخص غير موجود).
   - التليفون → `010` + 8 أرقام عشوائية. الباسورد → يُحذف الحقل نهائيًا من الـ JSON.
   - **يحافظ على:** التوزيع (الأدوار، الأقسام، الصلاحيات، workType) عشان الـ seed يفضل واقعي.
2. عدّل `api/prisma/seed.ts`: بدل fallback الباسورد الحالي (السطر 79: `u.password ?? financialNumber`) → ولّد باسورد عشوائي 12 حرف لكل مستخدم واطبع ملف `seed-passwords.csv` **خارج الريبو** (في مجلد مُتجاهَل) + حط `mustChangePassword: true` للجميع. حساب admin ياخد باسورد من متغير بيئة `SEED_ADMIN_PASSWORD` (إلزامي، السكريبت يرفض يشتغل من غيره).
3. أنشئ 8 حسابات test صناعية في ملف جديد `api/prisma/seed-data/test-users.json` (تُزرع فقط لو `NODE_ENV !== "production"`) — دي اللي هيستخدمها المسار B في e2e بدل أسماء الناس الحقيقية. الصيغة: `test-employee / Test@1234` إلخ.
4. **مسح التاريخ:** بعد ما الملفات الجديدة تتعمل commit:
   ```bash
   pip install git-filter-repo
   git filter-repo --invert-paths \
     --path api/prisma/seed-data/users.json \
     --path src/imports/medical-system-brd-v1.pdf \
     --path "src/imports/WhatsApp_Image_2026-05-18_at_5.18.18_PM.jpeg" \
     --force
   git push --force --all && git push --force --tags
   ```
   ⚠️ تنسيق مطلوب: كل من عنده clone يعمل re-clone بعدها. لو الريبو على GitHub، الـ PRs القديمة بتحتفظ بنسخة — لو الريبو private وفريقك فقط، مقبول؛ لو لا، كلّم GitHub support لمسح الـ cache.
5. على أي بيئة شغالة فعليًا: شغّل سكريبت rotation يعمل hash جديد للجميع + `mustChangePassword = true`.

**تم عند:** users.json في HEAD والتاريخ كله = بيانات وهمية، ومفيش حقل password في أي JSON، والـ e2e بيعدي بحسابات test-*.

---

## A2 — قفل تسريب PII من `/users/lookup`

**المشكلة:** `api/src/modules/users/users.route.ts:95-119` — أي مستخدم authenticated بياخد `nationalId` + `phone` لكل الموظفين.

**التنفيذ:** غيّر الـ `select` ليرجع فقط ما تستهلكه الواجهة فعليًا:
```ts
select: { id: true, name: true, role: true, department: true,
          financialNumber: true, jobTitle: true, isActive: true }
```
(`financialNumber` مطلوب لأن `managersStore`/`departmentsStore` بيربطوا بيه، و`jobTitle` معروض في resolver الطبيب.) احذف `nationalId`, `phone`, `workPlace`, `workType` من الـ select **ومن** interface `ApiUserLookup` في `src/app/lib/dataApi.ts` ومن mapping `managersStore.syncFromApi` (المسار A مسموح له بالسطور دي — تعديل أنواع فقط). أضف test في `api/tests/api.test.ts`: موظف عادي ينده lookup → الرد **لا يحتوي** `nationalId`.

---

## A3 — نقل قواعد العمل للسيرفر

**المشكلة:** حد الـ 3 كشوفات/شهر + «طلب مفتوح واحد» موجودين في `CreateMedicalRequestPage.tsx` فقط. أي HTTP client يتخطاهم.

**التنفيذ:** في `api/src/modules/requests/requests.service.ts → createRequest()`، لُف الإنشاء في `prisma.$transaction` وقبل الـ create:

```ts
// 1) طلب مفتوح واحد فقط لكل موظف
const OPEN_STATUSES = REQUEST_STATUSES.filter((s) => !isClosedStatus(s));
const open = await tx.medicalRequest.count({
  where: { employeeId: input.employeeId, status: { in: OPEN_STATUSES } },
});
if (open > 0) throw conflict("يوجد طلب مفتوح بالفعل لهذا الموظف");

// 2) حد 3 كشوفات عادية مكتملة في الشهر الميلادي الحالي
if (input.serviceType !== "monthly_treatment" && input.requestType !== "emergency") {
  const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
  const used = await tx.medicalRequest.count({
    where: { employeeId: input.employeeId, serviceType: "checkup",
             requestType: "normal", status: "completed",
             createdAt: { gte: start } },
  });
  if (used >= 3) throw badRequest("تم استهلاك الحد الشهري للكشوفات العادية (3)");
}
```
`conflict/badRequest` موجودين أصلاً في `lib/httpError.ts`. الحد `3` يطلع ثابت `MONTHLY_CHECKUP_LIMIT` في `packages/shared/src/workflow.ts` عشان الفرونت يقرأ نفس الرقم بدل الـ 3 المكتوبة يدويًا. **سيب فحوصات الـ client زي ما هي** — دورها UX مبكر، مش حماية. أضف 2 tests: تجاوز الحد → 400، طلب تاني مفتوح → 409.

---

## A4 — سياسة باسورد حقيقية

**المشكلة:** `users.route.ts:35` → `min(4)`.

**التنفيذ:** أضف في `packages/shared/src/index.ts`:
```ts
export const passwordSchema = z.string()
  .min(8, "8 أحرف على الأقل")
  .regex(/[a-zA-Z]/, "لازم حرف واحد على الأقل")
  .regex(/[0-9]/, "لازم رقم واحد على الأقل");
```
(هيحتاج `zod` كـ dependency في shared — موجود أصلاً في الـ workspace.) استخدمه في `createUserSchema` (users.route.ts) و`changePasswordSchema` (auth.schema.ts). **ملاحظة:** ده بيمنع الحسابات القديمة من الاستمرار بباسوردات ضعيفة عند أول تغيير — وهو المطلوب مع A1.

---

## A5 — السيرفر يولّد الـ ID، مش المتصفح

**المشكلة:** `requests.schema.ts:8` بيقبل `id` من العميل، والعميل بيولّده `REQ-{السنة}-{Date.now()}`.

**التنفيذ:**
1. **API:** احذف حقل `id` من `createRequestSchema` ومن التمرير في `createRequest` — يفضل `@default(uuid())` بتاع Prisma هو المصدر.
2. **الفرونت (`src/app/store/requestStore.ts` — ضمن حدود المسار A):** في `create()`:
   - ولّد id مؤقت: `const tempId = \`tmp-${crypto.randomUUID()}\``.
   - أضف الطلب optimistically بالـ tempId زي دلوقتي.
   - عند رجوع السيرفر: استبدل العنصر كاملًا (مش merge بالحقول) — عدّل `mergeRequest` ليدعم تغيير الـ id:
     ```ts
     this.requests = this.requests.map((r) => r.id === tempId ? created : r);
     ```
   - في `CreateMedicalRequestPage` (مسار B هينسق): زرار «عرض» لطلب لسه `tmp-` يتعطّل أو الجدول يتحدث تلقائيًا (هو reactive أصلاً فهيتحدث لوحده لما الـ id الحقيقي يوصل).

---

## A6 — توحيد سجل العمليات (بدل الكتابة المزدوجة)

**المشكلة:** `app.ts:41-63` (hook HTTP بدون userName) + `requests.service.ts` (سجل تفصيلي) = صفين لكل عملية، ونص شاشة السجل «غير محدد».

**القرار:** السجل التفصيلي (domain-level) هو الأصل. الـ HTTP hook يكمّله مش يكرره.

**التنفيذ:** في hook الـ `onSend`:
1. أضف `userName: (req.user as { name?: string })?.name ?? null` — التوكن فيه الاسم أصلاً.
2. استثنِ المسارات اللي بتسجل نفسها domain-level: `if (req.routeOptions.url?.startsWith("/requests")) return;`
3. كارت «سجلات العمليات» في SuperAdmin هيرجع رقم حقيقي تلقائيًا بعدها.

---

## A7 — تفعيل جدول الأقسام (وإصلاح الـ bug المُعطِّل معًا) 🔄 «تشغيل مش مسح»

**المشكلة المزدوجة:** جدول `Department` في Prisma + `seed-data/departments.json` ميتين (مفيش route)، والفرونت بيبني الأقسام من المديرين بسطر غلط (`departmentsStore.ts:62` → `name: mgr.name`) — النتيجة: **طلب الكشف العادي مكسور**.

**التنفيذ (تفعيل البنية الموجودة):**
1. **Route جديد** `api/src/modules/departments/departments.route.ts`:
   ```ts
   app.get("/", { preHandler: [app.authenticate] }, async () => {
     const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
     // أكمل اسم المدير من جدول المستخدمين حسب managerFinancialNumber
   });
   ```
   وسجّله في `app.ts` بـ prefix `/departments`.
2. **Seed:** في `api/prisma/seed.ts` ازرع `departments.json` في الجدول (upsert بالاسم).
3. **الفرونت** (`departmentsStore.ts` — ضمن المسار A): `syncFromApi()` يجيب من `/departments` مباشرة ويمسح منطق بناء الأقسام من المديرين. لو عايز تحتفظ بالمسار الاحتياطي (قسم موجود عند مدير ومش في الجدول)، أصلح السطر: `name: row.department` **مش** `mgr.name`.
4. أضف e2e سريع أو API test: موظف قسمه «التقطير» يلاقي مديره — ده الفلو اللي كان مكسور.

---

## A8 — تفعيل المرفقات كفيتشر حقيقي 🔄 «تشغيل مش مسح»

**المشكلة:** واجهة رفع كاملة في `CreateMedicalRequestPage` والملفات بتموت في الـ state. جدول `RequestAttachment` جاهز ومستني.

**التنفيذ:**
1. **API:** أضف `@fastify/multipart`. Route: `POST /requests/:id/attachments` (authenticate + `canReachRequest` بتاع الطلب نفسه):
   - حدود على السيرفر: 5MB، أنواع `image/png, image/jpeg, application/pdf` (اتحقق من الـ magic bytes مش الامتداد — مكتبة `file-type`).
   - التخزين: `UPLOADS_DIR` من env (في Docker: volume `/data/uploads`)، اسم الملف المخزّن = `uuid` + الامتداد (اسم المستخدم الأصلي يتسجل في العمود `fileName` فقط — **ممنوع** يدخل في المسار عشان الـ path traversal).
   - سجّل صف `RequestAttachment` + رجّعه.
2. `GET /requests/:id/attachments/:attId` للتنزيل — نفس فحص `canReachRequest`، و`Content-Disposition: attachment`.
3. **الفرونت:** بعد نجاح `createRequestApi`، ارفع الملفات واحدًا واحدًا بـ `FormData` (مش JSON — عدّل `apiFetch` ليتخطى `Content-Type` اليدوي لو الـ body `FormData`). اعرض حالة رفع لكل ملف، وفشل الرفع لا يفشل الطلب — يظهر تحذير «الطلب اتسجل والمرفق فشل، أعد المحاولة من صفحة التفاصيل».
4. اعرض المرفقات في `RequestDetailsPage` (البيانات راجعة أصلاً في `include: { attachments }`).

---

## A9 — نظافة الريبو (مع A1 في نفس الموجة)

- `src/imports/` (الـ BRD + صورة الواتساب): بتتشال من التاريخ في A1 — احذفها من الـ working tree أيضًا. الـ BRD يتنقل لـ drive/wiki داخلي.
- `public/logo.png.png`: ده JPEG متسمّي PNG مرتين. صدّر اللوجو الحقيقي PNG باسم `public/logo.png` وعدّل أي مرجع.
- أضف لـ `.gitignore`: `tree.txt`, `*-tree.txt`, `dist/`, `seed-passwords.csv` وامسحهم من المجلد.
- احذف `package-lock.json` (المشروع pnpm — lockfile واحد فقط: `pnpm-lock.yaml`).

---

# المسار B — التصليحات الموازية (الترتيب مرن، الأرقام حسب الأولوية)

## B1 — اللينكات المكسورة (ربع ساعة)
`/employee/my-requests` → `/my-requests` في:
- `src/app/features/requests/pages/CreateMedicalRequestPage.tsx:147`
- `src/app/features/requests/pages/RequestDetailsPage.tsx:105-106` (الشرط كله يتشال — الكل بيروح `/my-requests`)
- `src/app/features/notifications/pages/NotificationsPage.tsx:189`

## B2 — شهر التقارير (5 دقايق)
`ReportsPage.tsx:53`: `useState("2026-06")` → `useState(() => new Date().toISOString().slice(0, 7))`.

## B3 — مؤشرات المدير
`ManagerApprovalsPage.tsx`:
- KPI «تمت الموافقة اليوم» (سطر 120): فلتر على `approvedAt` مش `createdAt`.
- سطر 92: مدير بلا قسم → `return []` (fail-closed زي السيرفر) مش `return allRequests`.

## B4 — إظهار الأخطاء بدل البلع
- `SuperAdminPage.tsx:313`: الـ `catch` الفاضي → `toast.error("فشل تغيير الدور: " + message)` (sonner موجود ومستخدم في باقي الصفحات).
- `apiClient.ts:57`: عند 401 → `clearToken()` ثم `window.location.assign("/")` (مع استثناء نداء `/auth/login` نفسه عشان رسالة «بيانات غلط» تظهر عادي).
- استبدل كل `window.alert/confirm` المتبقية (SuperAdminPage + requestStore) بـ toast + `AlertDialog` بتاع Radix للـ confirmations.

## B5 — تفعيل `admin/components/` 🔄 «تشغيل مش مسح» (أكبر مكسب سطور)
المكونات الجديدة (447 سطر) نسخة من الـ inline بتاع `SuperAdminPage.tsx`. **فعّلها:**
1. في `SuperAdminPage.tsx`: استورد `StatCard, LoadingState, ErrorState, EmptyState, PermissionsEditor` من `../components/adminShared` و`RolesTab, PermissionsTab, DepartmentsTab, RoleUsersTab, AuditLogsTab` من ملفاتها و`roleLabels/permissionLabels/apiUserToUser` من `../lib/adminMappers`.
2. امسح كل التعريفات الـ inline المطابقة (سطور ~50-250 و777-1006 تقريبًا).
3. قايمة الأدوار اليدوية (سطور 510-518): بدّلها بـ `USER_ROLES.map((r) => <option>{roleLabel(r)}</option>)` — يوحّد التسميات المتناقضة («مدير» vs «مدير/مكلف»).
4. **مشكلة معمارية بسيطة أثناء الربط:** `UsersTab` بيجيب المستخدمين لنفسه والصفحة الأم بتجيبهم تاني. خلي الأم تجيب مرة واحدة وتبعت `users` + `onUsersChange` لـ `UsersTab` — fetch واحد بدل اتنين، والتعديل يظهر في كل التابات.
5. الهدف: `SuperAdminPage.tsx` ينزل من 1,168 لأقل من 350 سطر، و`pnpm typecheck` نضيف.

## B6 — توحيد المكرر (تكرار = يتمسح ويتوحد)
| أنشئ | وانقل إليه | واحذف النسخ من |
|---|---|---|
| `src/app/lib/format.ts` | `formatDate` (نسخة `Intl.DateTimeFormat` بتاعة CreateMedicalRequestPage — الأكمل) | 7 صفحات |
| `src/app/components/StatCard.tsx` | `StatCard` مُعمم (label, value, icon, tone) | 8+ صفحات (بعد B5) |
| `packages/shared/src/workflow.ts` | `statusBadgeClasses: Record<RequestStatus, string>` | `getStatusBadge` في 3 صفحات |
| `src/app/lib/arabic.ts` | `normalizeArabicText` — **نسخة واحدة بـ `toLowerCase()`** (الأشمل) | managerResolver, monthlyTreatmentResolver, departmentsStore |
| `api/src/lib/permissions.ts` | `parsePermissions(raw): Permission[]` بـ try/catch | auth.route.ts, users.route.ts, **jwt.ts:63 (ده اللي من غير حماية — أولوية)** |

## B7 — تسطيح طبقات الـ workflow (تكرار خالص = يتشال)
- `workflowStore.ts`: الـ 18 wrapper ماتوا محدش بينده عليهم — احذفهم. الباقي (`moveStatus`) دالة واحدة: انقلها جوه `WorkflowContext` واحذف الملف.
- `WorkflowContext`: بدل 16 دالة wrapper، صدّر `moveRequest(id, status, note)` واحدة + ثابت أسماء للحالات لو الصفحات محتاجة وضوح. الصفحات تتحدث: `approveRequest(id)` → `moveRequest(id, "approved")`.
- احذف كذلك: `profileRowToUser` من `AuthContext.tsx` (mapper لصفوف Supabase — البنية اتشالت، مش قابل للإحياء)، و`scripts/seed-users.ts` + `.mjs` (بيستوردوا ملف محذوف ومكتبة مش متسطبة وبيكلموا Supabase — وظيفتهم بيقوم بها `api/prisma/seed.ts` فعليًا).
- `dataApi.ts:146`: شيل باراميتر `userId` من `listNotificationsApi` — السيرفر بيتجاهله.

## B8 — التبعيات
`pnpm remove @mui/material @mui/icons-material @emotion/react @emotion/styled canvas-confetti` — صفر استخدام (اتأكدنا بـ grep). دي مش «كود ميت يتفعّل» — ده design system تانٍ كامل مكرر لـ Radix/shadcn المستخدم فعليًا. بعد الحذف: `pnpm dev` + `pnpm build` للتأكد.

## B9 — اختبارات e2e حقيقية
النمط الحالي (كل خطوة في `if (isVisible())` + نهاية `waitForTimeout`) = اختبار بينجح والسيستم واقع. القاعدة الجديدة لكل test:
1. **ممنوع** `if (await x.isVisible())` — لو العنصر أساسي، `await expect(x).toBeVisible()` مباشرة (يفشل لو مش موجود، وده المطلوب).
2. **ممنوع** إنهاء test بـ `waitForTimeout` — النهاية assertion على أثر ملموس:
   ```ts
   await expect(page.getByText("تم إرسال الطلب بنجاح")).toBeVisible();
   await page.goto("/my-requests");
   await expect(page.getByText("صداع مستمر واحتياج كشف طبي")).toBeVisible();
   ```
3. أضف `data-testid` للعناصر الحرجة (زرار الإرسال، صفوف الجداول) بدل مطابقة نصوص عامة زي `getByText("كشف")`.
4. استخدم حسابات `test-*` الصناعية من A1 — **ممنوع أسماء موظفين حقيقية**.
5. ابدأ بإعادة كتابة `04-employee-requests` (هو اللي فوّت الـ bug المُعطِّل) ثم `05-manager-approvals` ثم `16-full-workflow` — دول العمود الفقري.

## B10 — تقسيم الصفحات العملاقة (بعد B5+B6)
`CreateMedicalRequestPage` (849) → `RequestForm` + `EmployeeInfoCard` + `MonthlyLimitCard` + `WorkflowStepsCard` + `RecentRequestsTable`. نفس الفكرة لـ DoctorDiagnosis/Dashboard/ManagerApprovals/DoctorPage. و`PageLayout` (517): طلّع مصفوفة الـ nav لـ `navConfig.ts`. **قاعدة:** التقسيم بيحصل **بعد** ثبات السلوك — مش أثناء إصلاح bug.

---

# المرحلة 3 (مشتركة — بعد دمج المسارين)

1. **Pagination:** ‏`GET /requests?page=&pageSize=&status=` بـ `take/skip` + `X-Total-Count`، و`WorkflowContext` يبطّل يحمّل الدنيا كلها لكل الأدوار — كل صفحة تطلب حالاتها (الطبيب: `checked_out,in_diagnosis`، الصيدلية: `prescribed,monthly_ready_pharmacy`... الخريطة موجودة في `statusPermission`). نفس الشيء لجدول الـ audit (500 صف حاليًا).
2. **ESLint + Prettier** + سطر في الـ CI (`pnpm lint`). قواعد أساسية: `no-unused-vars`, `no-empty` (كان هيمسك الـ catch الفاضي), `react-hooks/exhaustive-deps`.
3. **e2e في الـ CI** (الـ Playwright config جاهز، بس محتاج service بيئة).
4. **cache 30 ثانية** لقراءة المستخدم في `authenticate` لو الحمل زاد (نقطة مسجلة، مش عاجلة).

---

# التحقق (ينفذ في نهاية كل مهمة)

```bash
pnpm typecheck && pnpm --filter @asroc/api typecheck   # صفر أخطاء
pnpm --filter @asroc/api test                           # اختبارات الـ API
pnpm test:e2e                                           # بعد B9
pnpm build                                              # قبل أي دمج
```

**تعريف «Product-ready» لهذه الخطة:** صفر PII في الريبو والتاريخ · كل قاعدة عمل لها test على السيرفر · الفلو الرئيسي (كشف عادي من الطلب للاكتمال) يعدي e2e بـ assertions حقيقية · مفيش ملف صفحة فوق 400 سطر · مفيش دالة helper متكررة في أكتر من ملف.
