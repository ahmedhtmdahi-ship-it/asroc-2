# نظام إدارة الخدمات الطبية — ASORC Medical Services

نظام شامل لإدارة الخدمات الطبية في شركة أسيوط لتكرير البترول (ASORC)، يدعم 10 أدوار مختلفة مع واجهة عربية كاملة.

---

## البنية التقنية

| | Frontend | Backend |
|---|---|---|
| المسار | `/` (الجذر) | `medical-api/` |
| التقنية | React 18 + TypeScript + Vite + Tailwind CSS 4 | PHP 8.3 + Laravel 13 + Sanctum + Spatie Permission |
| المنفذ الافتراضي | `5173` | `8001` |
| قاعدة البيانات | — | SQLite (افتراضي) أو MySQL |

---

## تشغيل سريع

### Backend
```bash
cd medical-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8001
```

### Frontend
```bash
pnpm install --ignore-scripts
pnpm dev
```

المتغير البيئي `VITE_API_URL` يحدد رابط الـ API (افتراضي: `http://localhost:8001/api`).

---

## مستخدمو الاختبار (كلمة المرور: `password`)

| الدور | البريد الإلكتروني |
|---|---|
| موظف | `employee@test.com` |
| صاحب معاش | `retired@test.com` |
| مدير | `manager@test.com` |
| مدير مكتب | `office.manager@test.com` |
| أمن | `security@test.com` |
| طبيب | `doctor@test.com` |
| صيدلية داخلية | `internal.pharmacy@test.com` |
| صيدلية خارجية | `external.pharmacy@test.com` |
| إدارة طبية | `medical.admin@test.com` |
| مدير النظام | `admin@test.com` |

---

## المميزات الرئيسية

- **طلبات الكشف الطبي** — عادي (3 شهريًا) أو طوارئ (يُعتمد فورًا)
- **دورة الموافقة** — مدير → أمن (خروج/عودة) → طبيب → صيدلية → مكتمل
- **التحويلات الخارجية** — الطبيب يكتب التحويل → الإدارة الطبية تراجع → يُولَّد PDF تلقائيًا
- **العلاج الشهري** — للمزمنين وأصحاب المعاش، مستقل عن دورة الكشوف
- **إدارة المخزون** — أدوية مع تنبيهات الحد الأدنى، استيراد Excel
- **الإشعارات** — داخل النظام لكل حدث في دورة الطلب
- **التقارير** — يومية/شهرية/طوارئ مع تصدير PDF وExcel

---

## مسار حالة الطلب

```
pending → approved → checked_out → in_diagnosis → prescribed → dispensed → returned → completed
         ↘ rejected / postponed / cancelled
```

---

## هيكل المشروع

```
asroc-2/
├── src/                        # React/TypeScript frontend
│   └── app/
│       ├── context/            # WorkflowContext (حالة الطلبات المركزية)
│       ├── features/           # صفحة لكل دور (auth, admin, clinical, pharmacy, ...)
│       ├── services/           # apiClient, authService, checkupService, ...
│       ├── store/              # mock stores (fallback عند انقطاع API)
│       └── types/              # MedicalRequest, User, RequestStatus, ...
│
└── medical-api/                # Laravel 13 REST API
    ├── app/
    │   ├── Enums/              # CheckupStatus, ReferralStatus, ...
    │   ├── Http/Controllers/   # مقسمة حسب role prefix
    │   ├── Http/Resources/     # JSON response formatters
    │   ├── Models/             # Eloquent models
    │   └── Services/           # CheckupService, PharmacyService, PdfService, ...
    ├── database/
    │   ├── migrations/         # 15+ جدول
    │   └── seeders/            # RolePermission, Departments, Users, Medicines
    └── routes/api.php          # كل endpoints مع auth:sanctum
```

---

## القواعد التجارية المهمة

| القاعدة | القيمة |
|---|---|
| حد الكشوف الشهرية | 3 |
| سن الابن المستفيد | 26 |
| حد التأخير الأمني | 3 ساعات |

مُعرَّفة في `medical-api/config/medical.php`.
