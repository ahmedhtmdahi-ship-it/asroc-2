# HATM OS (حوتمة)

```
النظام يقرا ويقارن ويجهّز  →  حاتم يوافق  →  النظام ينفذ ويسجّل
```

وقاعدة تانية مش أقل أهمية: **حقائق مش تخمين.** كل حالة في النظام معاها
`evidence` — جملة قابلة للفحص. ولو المهمة مالهاش ملف تسليم، النظام بيقول
إنه **مش قادر يتحقق** وبيسأل، مبيخمّنش.

---

## الهيكل

```
hatm-os/
├── docker-compose.yml · Dockerfile · requirements.txt · .env.example
├── alembic/                  ← migrations
├── app/
│   ├── main.py · config.py · db.py · celery_app.py
│   ├── models/    project · person · task · deliverable
│   │              session · trainee · attendance
│   │              message · approval · workflow · activity
│   ├── domain/    duration · rules · templates · priorities     ← منطق خالص
│   ├── adapters/  base (ABCs) · sheets · gmail · zoom · ai_client · fake
│   ├── orchestration/  engine · approval · antispam · messaging
│   │                   flows/close_session
│   ├── api/       projects · sessions · reviews · approvals · dashboard · command · ws
│   ├── core/      logging · errors · idempotency · events · timeutil
│   ├── services/  dashboard
│   └── tasks/     attendance · followup · brief        ← Celery
├── tests/         domain · orchestration · api · fixtures
├── ai/            خدمة المطابقة والنوايا (L4، بورت 8100)
└── frontend/      React + TS (L6)
```

الـ Docker build context للـ api/worker/beat هو الجذر، و`.dockerignore` بيستبعد
`ai/` و `frontend/` و `docs/`.

---

## المراحل

### ✅ المرحلة ٠ — الأساس
هيكل المشروع · docker-compose · config · **كل الـ models** · migration واحد
شغال · `@logged` decorator · **Adapter interfaces (ABCs)** · هيكل الاختبارات ·
الملف ده.

### 🔜 المرحلة ١ — متابعة المهام (القلب)
`SheetsAdapter` لقراءة شيت المهام · `DriveAdapter` بالفخاخ الخمسة ·
**`domain/task_status.py` + اختباراته العشرة** · `flows/scan_tasks.py` ·
`TelegramAdapter` · endpoints المهام والفريق.

**الحلقة:** شيت المهام (المطلوب) + الدرايف (الموجود) → مقارنة → حالة + دليل →
رسائل مجهّزة → موافقة → إرسال + تسجيل.

### ⏸️ فاصل — أسبوعين استخدام حقيقي

### ✅ المرحلة ٢ — الحضور *(اتبنت بالفعل)*
`ZoomAdapter` · `domain/duration.py` · `domain/rules.py` · `flows/close_session.py`
(١٠ خطوات) · خدمة المطابقة · شاشة المراجعة.

### 🔜 المرحلة ٣ — العرض
`/api/dashboard/today` · Daily Brief · تحسين `/api/command`.

> الحضور اتبنى قبل ما ترتيب المراحل يتغيّر، فهو موجود وشغال ومتغطى باختبارات.
> مش محتاج شغل دلوقتي.

---

## التشغيل من الصفر

```bash
cp .env.example .env
docker compose up --build
docker compose exec api python -m scripts.seed_demo
```

| الخدمة | العنوان |
|---|---|
| الواجهة | http://localhost:3000 |
| الـ API | http://localhost:8000/health · /api/docs |
| خدمة الذكاء | http://localhost:8100/health |

`ADAPTER_MODE=fake` (الافتراضي) بيشغّل الـ adapters كنسخ في الذاكرة ببيانات
مموّهة — تقدر تجرب من غير أي credentials.

---

## إعداد Google Service Account

```
1. console.cloud.google.com → مشروع جديد
2. APIs & Services → Enable: Google Drive API · Google Sheets API
3. Credentials → Create Service Account → Keys → JSON → نزّله
4. حطه في secrets/service-account.json
```

### ⚠️ الخطوة اللي الناس بتنساها

الـ service account **مش بيشوف حاجة** لحد ما تشاركها معاه صراحة:

- **شيت المهام** → Share → إيميل الـ SA (`xxx@project.iam.gserviceaccount.com`)
  → **Viewer** (أو Editor لو هتكتب عمود الحالة)
- **فولدر المشروع الجذر في الدرايف** → Share → نفس الإيميل → **Viewer**

من غير كده هتاخد **404** عىل الفولدر و**403** عىل الشيت، وهتفضل تدوّر في الكود
والمشكلة مش في الكود.

### Shared Drive

لو الفولدرات عىل Shared Drive مش My Drive، لازم `DRIVE_SHARED_DRIVE=true`.
من غيرها الـ API بيرجّع **ليست فاضية بدون خطأ** — أسوأ نوع فشل. وكمان ضيف الـ
SA كعضو في الـ Shared Drive نفسه، مش بس شارك الفولدر.

---

## إعداد بوت تيليجرام

```
1. كلّم @BotFather → /newbot → اختار اسم ويوزرنيم
2. هيديك token → TELEGRAM_BOT_TOKEN في .env
3. كل واحد في الفريق يبعت /start للبوت مرة واحدة
4. خد chat_id بتاعه من:
   curl https://api.telegram.org/bot<TOKEN>/getUpdates
   وحطه في Person.telegram_chat_id
```

الردود بتترجع للمهمة عن طريق `reply_to_message_id`.

**واتساب مؤجل.** الإعلانات الجماعية هتبقى `channel="draft"` — النظام يجهّز
النص وإنت تنسخ وتلزق.

---

## إعداد Zoom (المرحلة ٢)

```
marketplace.zoom.us → Develop → Build App → Server-to-Server OAuth
Scopes: report:read:admin · meeting:read:admin
Account ID · Client ID · Client Secret → .env  ·  وفعّل الـ app
```

---

## Feature Flags

```
FF_SEND_TELEGRAM=false     ← ابدأ مقفول
FF_SEND_EMAIL=false
FF_WRITE_SHEET=false
FF_SCHEDULED_SCAN=false
```

أول أسبوعين: النظام يفحص ويجهّز ويعرض بس ميبعتش.

---

## الاختبارات

```bash
pytest -q                                            # 59
pytest --cov=app/domain --cov-report=term-missing    # 97% — الحد 95%
ruff check .

cd ai       && pytest -q && ruff check .             # 31
cd frontend && npm test && npm run lint              # 17
```

---

## قرارات وفخاخ مسجّلة

- **`app/domain/` مفيهاش I/O.** لا httpx ولا sqlalchemy. لو احتجت I/O هناك،
  الكود في الطبقة الغلط.
- **`Deliverable.size_bytes = None` معناها "مش معروف" مش صفر** — ملفات جوجل
  الأصلية (Docs/Sheets/Slides) الـ API مبيرجعش ليها `size`. اللي حجمه صفر
  فعلاً بيبقى `0`.
- **`Person.drive_email` منفصل عن `email`** لأن اللي بيظهر في
  `lastModifyingUser` ساعات بيبقى إيميل تاني. `match_emails` بيغطي الاتنين.
- **JSON columns:** `list.append()` مبيتحفظش في SQLAlchemy — لازم إعادة إسناد
  الليست كاملة (شوف `Trainee.add_alias`).
- **الموافقة idempotent** — المفتاح = hash(type + payload)، وضغطتين = تنفيذ واحد.
- **AntiSpam دالة واحدة** بتغطي الفريق والمتدربين، وكل إرسال بيعدي منها.
- **الـ ActivityLog بيكتب بـ session منفصلة** عشان لو العملية عملت rollback
  السجل يفضل موجود، وفشل اللوج مبيوقعش العملية أبدًا.
- **بيانات حقيقية ممنوعة** في الريبو أو الاختبارات. `tests/fixtures/` كله مموّه.
