# ملف التسليم — ASROC (نظام إدارة الخدمات الطبية)

نظام طبي **on-prem**: كل الداتا والـ auth على سيرفر الشركة، تتشارك بين كل الأجهزة على الشبكة
الداخلية — من غير أي خدمة سحابية.

**الـ Stack:** React + Vite (الواجهة) · Node + TypeScript + Fastify + Prisma + **SQLite** (الباك) · Docker.
`packages/shared` فيه تعريفات الأدوار/الصلاحيات/الـ workflow المشتركة بين الاتنين.

---

## التشغيل بأمر واحد (نشر on-prem)

```bash
# 1) سر قوي للـ JWT (السيرفر بيرفض القيمة الافتراضية)
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# 2) شغّل كل حاجة
docker compose up -d
```

- الواجهة بتتفتح على `http://<server-ip>/` (منفذ 80).
- الـ API خلف الواجهة على `/api` (بروكسي nginx) — مش متعرّض للمضيف مباشرةً.
- أول إقلاع بيطبّق الـ migrations ويزرع 1755 مستخدم + 35 قسم + 19343 دواء تلقائيًا (idempotent).

**أول دخول:** كل الحسابات المزروعة لازم تغيّر الباسورد أول مرة (شاشة إجبارية). الباسوردات
الأولية = الاسم الأول + الرقم المالي (زي الداتا الأصلية)؛ حساب `admin` كمان لازم يغيّر باسورده أول دخول.

تأكيد سريع:
```bash
curl http://localhost/api/health/ready    # {"status":"ok","db":"up"}
```

---

## التطوير المحلي (من غير Docker)

```bash
# الباك
cd api && cp .env.example .env && pnpm install
pnpm prisma:generate && pnpm prisma migrate dev && pnpm db:seed && pnpm dev   # :4000

# الواجهة (terminal تاني من الجذر)
cp .env.example .env.local            # VITE_API_URL=http://localhost:4000
pnpm install && pnpm dev              # :5173
```

---

## 📖 دليل التشغيل (runbook) لسيرفر الشركة

- **السر:** `JWT_SECRET` لازم ≥ 16 حرف ومختلف عن الافتراضي (env بيرفض غير كده والسيرفر ما يقلعش).
- **النسخ الاحتياطي:** الداتا كلها في ملف SQLite واحد على volume اسمه `sqlite_data` (`/data/prod.db`).
  نسخة احتياطية = نسخ الملف:
  ```bash
  docker compose exec api sh -c "cp /data/prod.db /data/backup-$(date +%F).db"
  ```
  انسخ الملف بره الحاوية بـ `docker cp`.
- **الاستعادة:** وقّف الحاوية، استبدل `/data/prod.db` بالنسخة، شغّل تاني.
- **الترقيات/تغيير الـ schema:** أضف migration في التطوير (`pnpm prisma migrate dev`)، اعمل commit
  لمجلد `api/prisma/migrations`، وعند النشر `docker compose up -d --build` — الـ entrypoint بيطبّق
  `prisma migrate deploy` تلقائيًا.
- **الأمان:** الأدوار/الصلاحيات في التوكن (JWT، 12 ساعة). تعطيل حساب (`isActive=false`) بيمنعه فورًا
  في الطلب اللي بعده (kill switch). تغيير الصلاحيات بيتفعّل بعد إعادة تسجيل الدخول.
- **الاستضافة:** SQLite كافية لسيرفر واحد بحمل متوسط (WAL مفعّل لتحسين القراءات المتوازية).
  لو الحمل التزامني كبر جدًا، مسار الترقية = PostgreSQL (تغيير `datasource` + إعادة الـ migrations).

---

## 🌐 أهم الـ API endpoints

| Method | Path | الحماية |
|---|---|---|
| POST | `/auth/login` | rate-limited (5/دقيقة) |
| GET | `/auth/me` | JWT (+ فحص isActive) |
| POST | `/auth/change-password` | JWT |
| GET/POST | `/requests` | JWT — القراءة مقصورة على صاحب الطلب إلا بصلاحية أوسع |
| GET/PATCH | `/requests/:id` | JWT — فحص ملكية/صلاحية |
| POST | `/requests/:id/transition` | صلاحية حسب التحويل (atomic) |
| GET/POST/PATCH | `/users` · `/users/:id` | `manage_system` |
| GET | `/users/lookup` | JWT (حقول عامة محدودة) |
| CRUD | `/medicines` | JWT |
| GET | `/notifications` · `/audit-logs` · `/security-logs` | JWT / `view_audit_log` |

---

## اللي اتعمل في جولة التصليح والتكملة الأخيرة

- **نشر شغّال فعلًا:** `docker compose up` بيطبّق migrations + seed تلقائيًا، وبيقدّم الواجهة عبر nginx
  ببروكسي `/api` (same-origin، مفيش IP متبيّت). SQLite بدل Postgres السحابي.
- **أمان:** إصلاح IDOR على الطلبات، تحويلات الـ workflow atomic (compare-and-set + 409)، قفل هوية
  المُنشئ، إجبار تغيير الباسورد أول دخول، kill switch لتعطيل الحساب، تثبيت HS256، مقارنة bcrypt
  وهمية ضد timing enumeration.
- **سلامة بيانات:** توحيد مفتاح الإحالة (`referral`↔`referralData`)، تمرير ملاحظة القرار لـ timeline
  السيرفر، تسلسل نداءات الطبيب/الأمن المترابطة.
- **تنظيف:** شيل ملفات الـ mock الضخمة من الـ frontend (بقت JSON للـ seed في `api/prisma/seed-data`)،
  حذف artifacts قديمة، تصحيح `tsconfig` عشان الـ typecheck يعدّي.
- **اختبارات + CI:** اختبارات تكامل للـ API + GitHub Actions (typecheck + build + tests).

## متبقّي (تحسينات لاحقة، مش حاجب للنشر)

- تصغير الـ frontend bundle بالـ code-splitting (تحذير حجم الـ chunk).
- توحيد صفحات الأدوار المتفرقة تحت الداش بورد الموحدة بالتدريج (الداش بورد الموحدة شغّالة كنقطة دخول).
- إبطال التوكن عند تغيير الصلاحيات (حاليًا بيتطلب re-login).
