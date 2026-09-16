# HATM OS (حوتمة) — MVP

مساعد تشغيل للبرامج التدريبية. النظام بيفكر ويجهّز، حاتم بيوافق، النظام بينفذ ويسجّل.

المرجع الكامل للمعمارية والعقود في `docs/`. الملف ده بيقول **إزاي تشغّله** بس.

---

## شغّله في دقيقتين (من غير أي credentials)

```bash
cp .env.example .env          # ADAPTER_MODE=fake افتراضيًا
docker compose up --build
docker compose exec api python -m scripts.seed_demo
```

| الخدمة | العنوان |
|---|---|
| الواجهة | http://localhost:3000 |
| الـ API | http://localhost:8000/health · http://localhost:8000/api/docs |
| خدمة الذكاء | http://localhost:8100/health |

`ADAPTER_MODE=fake` بيشغّل Zoom و Sheets و Gmail كنسخ في الذاكرة ببيانات مموّهة —
نفس بيانات البروتوتايب (صفوف مكررة، أجهزة متداخلة، أسماء غامضة). تقدر تجرب
الدورة كاملة من غير ما تفتح حساب واحد.

**الدورة الكاملة:** افتح الواجهة → اكتب «اقفل سيشن React» → راجع ٣ أسماء →
وافق على الشيت → راجع الرسايل ووافق → الجلسة اتقفلت.

---

## الواجهة لوحدها (من غير باك اند)

```bash
cd frontend && npm install
VITE_USE_MOCK=true npm run dev        # http://localhost:5173
```

`src/api/mock.ts` بيحاكي العقد كامل في الذاكرة.

---

## التشغيل الحقيقي

بدّل `ADAPTER_MODE=real` في `.env` وجهّز الآتي:

**Zoom** — marketplace.zoom.us → Develop → Build App → **Server-to-Server OAuth**
Scopes: `report:read:admin` · `meeting:read:admin`
انسخ Account ID و Client ID و Client Secret في `.env`، وفعّل الـ app.

**Google** — console.cloud.google.com → مشروع جديد → فعّل Sheets API و Drive API →
Service Account → Key (JSON) → حطه في `secrets/service-account.json`.
⚠️ افتح شيت الحضور → Share → ضيف إيميل الـ service account كـ **Editor**، وإلا ٤٠٣.

**Gmail** — محتاج **domain-wide delegation** من Admin Console → Security → API Controls
بالـ scopes: `gmail.send` · `gmail.compose` · `gmail.readonly`. وحدد `GMAIL_SENDER`.

> `FF_SEND_EMAIL=false` افتراضيًا. النظام بيجهّز الرسايل ويحفظها **drafts** في Gmail
> بدل ما يبعتها. سيبه مقفول أول أسبوعين.

الشيت لازم يكون فيه عمود اسمه `Email` — النظام بيلاقي الصف بيه، ومبيكتبش
بعنوان خلية أبدًا. عمود الجلسة بيتعمل تلقائيًا باسم `<الجلسة> <التاريخ>`.

---

## الاختبارات

```bash
cd backend  && pytest -q && ruff check .      # 51 اختبار
cd ai       && pytest -q && ruff check .      # 31 اختبار · ١٣٩ حالة اسم
cd frontend && npm test && npm run lint       # 17 اختبار
```

نتيجة مجموعة أسماء الـ AI: **precision ١٠٠٪ · recall ٩٩٪ · مراجعة ٢٢٪**.

---

## اللي اتبنى

| الطبقة | الحالة |
|---|---|
| L0 مخزن | ٩ جداول + `tenant_id` + Alembic |
| L1 Adapters | Zoom · Sheets · Gmail · AI — كلهم وراء interfaces + نسخ fake |
| L2 Domain | `duration` · `rules` · `templates` · `priorities` — **بدون I/O** |
| L3 Orchestration | WorkflowEngine (resumable) · ApprovalGate · AntiSpamGate |
| L4 Intelligence | خدمة مستقلة على 8100: `/match` `/parse` `/learn` `/prioritize` |
| L5 API | REST + WebSocket + OpenAPI |
| L6 UI | Mission Control · Review · Session · Approvals · Timeline · Activity |

**`close_session` بقى ١٠ خطوات** (الدوك فيه ٦ + ٣ مؤجلين للمرحلة ٢):

```
Zoom → durations → match → rules → [موافقة] → sheet
     → compose → [موافقة] → send → finalize
```

### endpoints مضافة (مش تغيير في عقد قديم)

`POST /api/programs` · `POST /api/trainees` · `POST /api/sessions` ·
`GET /api/sessions/{id}` · `GET /api/sessions/{id}/run` ·
`GET /api/dashboard/charts` · `GET /api/dashboard/brief` · `GET /api/activity`
وفي خدمة الذكاء: `/learn` · `/prioritize` · `/normalize`.

### قواعد مضافة للمطابقة

فوق قاعدة العقد (`best ≥ 0.88` و `best − second ≥ 0.10`):

1. **الاحتواء** — اسم جزئي موجود جوه أكتر من متدرب (زي «محمد علي» وفيه
   «محمد علي» و«محمد علي حسن») → مراجعة إجباري مهما كان السكور.
2. **الكنية** — «أبو يوسف» مستحيل تتطابق تلقائي.
3. **التكرار** — اسمين في نفس التقرير مينفعش ياخدوا نفس المتدرب (إلا لو
   نفس الإيميل المتحقق منه — موبايل ولابتوب).

---

## ملاحظات تشغيل

- التقرير بيتأخر ١٥–٣٠ دقيقة بعد الجلسة. الـ workflow **بيقف** ومبيفشلش،
  والـ beat بيحاول كل ربع ساعة.
- الـ replay لنفس الجلسة بيدي نفس النتيجة بالظبط (الـ `raw_intervals` متخزنة).
- كل تأكيد يدوي في المراجعة بيتحول لـ alias محفوظ — بعد ٣ جلسات المراجعة بتقل جدًا.
- `.env` و `secrets/` مستبعدين من git. متحطش بيانات متدربين حقيقية في الريبو.
