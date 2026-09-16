# HATM OS — المعمارية والعقود المشتركة

> **اقرأ ده الأول.** كل واحد في الفريق لازم يفهم الملف ده قبل ما يفتح ملف دوره.
> ده المرجع الوحيد لأي خلاف عىل شكل البيانات أو حدود المسؤولية.

---

## ١. إيه المشروع ده

مساعد تشغيل ذكي يتولى الأعمال المتكررة في إدارة البرامج التدريبية:
حساب الحضور من Zoom، متابعة المتدربين، إرسال الرسائل — **بعد موافقة بشرية دائمًا**.

**المبدأ الحاكم:** النظام يفكر ويجهّز، الإنسان يوافق، النظام ينفذ ويسجّل.

**نطاق المرحلة الحالية:**
- ✅ أتمتة الحضور (Zoom → حساب → تصنيف → Sheets)
- ✅ المتابعة والتواصل (رسائل الغياب، Feedback، التذكيرات)
- ✅ شاشة التحكم والملخص اليومي
- ❌ خارج النطاق حاليًا: multi-tenant، واجهات الأدوار، Quality Gate، Report Engine

---

## ٢. المعمارية الطبقية

```
┌─────────────────────────────────────────────────────┐
│  L6  INTERFACES                                     │
│  React SPA · Chat · Daily Brief                      │
└────────────────────┬────────────────────────────────┘
                     │ REST / WebSocket
┌────────────────────┴────────────────────────────────┐
│  L5  API GATEWAY                                    │
│  Auth · Rate limit · Validation · WS push            │
└────────────────────┬────────────────────────────────┘
┌────────────────────┴────────────────────────────────┐
│  L4  INTELLIGENCE          (خدمات مستقلة)            │
│  Name Matcher · Intent Parser · Priority Engine      │
│  ← stateless · بترجع اقتراحات فقط · لا تنفذ          │
└────────────────────┬────────────────────────────────┘
┌────────────────────┴────────────────────────────────┐
│  L3  ORCHESTRATION         ← قلب النظام              │
│  Workflow Engine · Approval Gate · Scheduler         │
│  Anti-Spam Gate · Idempotency                        │
└────────────────────┬────────────────────────────────┘
┌────────────────────┴────────────────────────────────┐
│  L2  DOMAIN                (منطق خالص، بدون I/O)     │
│  Duration Engine · Rules Engine · Template Renderer  │
└────────────────────┬────────────────────────────────┘
┌────────────────────┴────────────────────────────────┐
│  L1  INTEGRATION           (Adapters)                │
│  ZoomAdapter · SheetsAdapter · GmailAdapter          │
└────────────────────┬────────────────────────────────┘
┌────────────────────┴────────────────────────────────┐
│  L0  PERSISTENCE                                    │
│  PostgreSQL · Redis · Object Store · Activity Log    │
└─────────────────────────────────────────────────────┘
```

### القواعد الأربعة (لو اتخرقت، المعمارية بتنهار)

1. **L4 مبينفذش أبدًا.** الذكاء يقترح، الـ Orchestration يقرر، الـ Integration ينفذ.
   لو خليت الـ LLM يستدعي Zoom مباشرة، خسرت التتبع والموافقات معًا.

2. **L2 مالهاش I/O.** الـ Duration Engine بياخد أرقام ويرجّع أرقام. مش بيقرأ من Zoom
   ولا بيكتب في Sheet. ده اللي بيخليك تختبره وتعيد حساب جلسات قديمة.

3. **كل خروج للعالم يمر بـ L3.** مفيش رسالة تتبعت ولا خلية تتكتب إلا عبر الـ
   Approval Gate والـ Activity Log.

4. **الـ Adapters وراء interfaces مجردة.** لو قناة فشلت، تبدّل الـ adapter من غير
   ما تلمس حاجة تانية.

---

## ٣. الستاك

| الطبقة | التقنية |
|---|---|
| Backend | Python 3.11 + FastAPI |
| DB | PostgreSQL 15 (JSONB مطلوب) |
| Queue / Scheduler | Celery + Redis + Celery Beat |
| AI Service | Python + FastAPI (خدمة HTTP منفصلة) |
| Frontend | React + TypeScript + Tailwind |
| Charts | Recharts |
| Deployment | Docker Compose عىل VPS واحد |

---

## ٤. Data Model المشترك

```sql
Program(id, tenant_id, name, start_date, attendance_rules_id,
        drive_folder_id)

Session(id, program_id, date, zoom_meeting_id, zoom_meeting_uuid,
        planned_start, planned_end, duration_planned, status)

Trainee(id, program_id, name_ar, name_en, email, phone,
        zoom_aliases JSONB)

AttendanceRecord(id, session_id, trainee_id, raw_intervals JSONB,
                 merged_intervals JSONB, total_minutes, percentage,
                 status, first_join, last_leave, disconnect_count,
                 match_confidence, match_method, reviewed_by, reviewed_at)

MessageTemplate(id, type, lang, subject, body, variables JSONB)

OutboundMessage(id, trainee_id, session_id, template_id, channel,
                rendered_subject, rendered_body, status, approval_id,
                idempotency_key, sent_at, error)

Approval(id, type, payload JSONB, preview JSONB, status,
         idempotency_key, expires_at, decided_by, decided_at)

WorkflowRun(id, definition, status, current_step, context JSONB,
            pause_reason, resume_token, created_at, updated_at)

ActivityLog(id, actor_type, actor_id, action, target_type, target_id,
            before JSONB, after JSONB, result, duration_ms, timestamp)
```

### ملاحظات إلزامية

- **`tenant_id` موجود من الآن** في `Program` وكل جدول جذري. مش هنستخدمه في
  المرحلة الحالية، بس إضافته بعدين = migration مؤلم.
- **`zoom_aliases`** هو مفتاح تحسّن المطابقة. كل تأكيد يدوي يتحول لـ alias محفوظ.
  بعد ٣ جلسات المراجعة اليدوية بتقل ~٩٠٪.
- **`raw_intervals` بيتخزن دايمًا** — عشان تقدر تعيد الحساب لو غيّرت القواعد.
- **`status` values:**
  `present | late | partial | absent | early_leave | needs_review`

---

## ٥. العقود بين الأعضاء

> **دي أهم حتة في الملف.** أي تعديل هنا لازم يتفق عليه التلاتة قبل التنفيذ.

### ٥.١ Backend ↔ AI: خدمة المطابقة

```http
POST http://ai-service:8100/match
```

**Request:**
```json
{
  "session_id": 412,
  "candidates": [
    {"idx": 0, "name": "احمد م.", "email": null, "user_id": null},
    {"idx": 1, "name": "Mohamed Ali", "email": "m.ali@x.com", "user_id": "abc"}
  ],
  "roster": [
    {"trainee_id": 12, "name_ar": "أحمد محمد", "name_en": "Ahmed Mohamed",
     "email": "ahmed@x.com", "aliases": ["احمد م", "ahmed m"]}
  ]
}
```

**Response:**
```json
{
  "matches": [
    {"candidate_idx": 0, "trainee_id": 12, "confidence": 0.91,
     "method": "alias", "needs_review": false, "suggestions": []},
    {"candidate_idx": 1, "trainee_id": null, "confidence": 0.42,
     "method": "fuzzy", "needs_review": true,
     "suggestions": [
       {"trainee_id": 7, "score": 0.42, "reason": "token_set"},
       {"trainee_id": 19, "score": 0.39, "reason": "embedding"}
     ]}
  ],
  "stats": {"auto_matched": 18, "needs_review": 3, "unmatched": 1}
}
```

**قاعدة القرار (في خدمة الـ AI):**
```
auto_match  ⟺  best.score ≥ 0.88  AND  (best.score − second.score) ≥ 0.10
غير كده     →  needs_review = true
```

**ممنوع منعًا باتًا:** إرجاع `trainee_id` بثقة أقل من ٠٫٨٨.
مطابقة غلط (false positive) أخطر بكتير من عدم المطابقة.

---

### ٥.٢ Backend ↔ AI: تحليل الأوامر (المرحلة ٢)

```http
POST http://ai-service:8100/parse
```

**Request:**
```json
{
  "text": "اقفل سيشن رياكت",
  "context": {
    "active_programs": [{"id": 3, "name": "React"}],
    "recent_sessions": [{"id": 412, "program_id": 3, "date": "2026-08-17"}]
  }
}
```

**Response:**
```json
{
  "intent": "close_session",
  "entities": {"program_id": 3, "session_id": 412},
  "confidence": 0.94,
  "clarification_needed": null
}
```

**لو فيه غموض:**
```json
{
  "intent": "close_session",
  "entities": {"program_id": 3, "session_id": null},
  "confidence": 0.71,
  "clarification_needed": {
    "question": "فيه ٣ جلسات React لسه مقفلتش — أنهي واحدة؟",
    "options": [
      {"session_id": 410, "label": "الأحد ١٠ أغسطس"},
      {"session_id": 412, "label": "الثلاثاء ١٢ أغسطس"}
    ]
  }
}
```

**Intents المدعومة (المرحلة ٢):**
`close_session` · `send_reminders` · `daily_brief` · `search` · `unknown`

---

### ٥.٣ Backend ↔ React: REST API

الـ OpenAPI spec الكامل في `/api/openapi.json`. الأساسيات:

```
GET    /api/sessions?status=&program_id=
GET    /api/sessions/{id}/attendance
POST   /api/sessions/{id}/close

GET    /api/reviews/pending
POST   /api/reviews/{id}/confirm    {trainee_id}
POST   /api/reviews/{id}/reject

GET    /api/approvals?status=pending
POST   /api/approvals/{id}/approve
POST   /api/approvals/{id}/reject   {reason}
PATCH  /api/approvals/{id}/payload  {edited_content}

GET    /api/dashboard/priorities
GET    /api/dashboard/summary
GET    /api/trainees/{id}/timeline

POST   /api/command                 {text}
WS     /api/ws                      → push updates
```

**شكل الأخطاء الموحّد:**
```json
{"error": {"code": "ZOOM_REPORT_NOT_READY",
           "message": "تقرير Zoom لسه مش متاح",
           "retry_after": 900}}
```

---

## ٦. المراحل والبوابات

### المرحلة ٠ — Foundation (أسبوع ١–٢)
**المخرجات:** Schema + migrations · Adapter interfaces · OpenAPI spec ·
هذا الملف · Docker Compose شغال · ActivityLog decorator

**بوابة العبور:** كل واحد قادر يشتغل ٤ أسابيع من غير ما يستنى حد.
لو فيه شخص مستني، المرحلة مخلصتش.

---

### المرحلة ١ — Attendance Core (أسبوع ٣–٧)
التكامل الأول: **أسبوع ٦**

```
✓ ٣ جلسات حقيقية اتقفلت بنجاح
✓ auto-match ≥ ٩٠٪
✓ false positives = صفر
✓ الحسابات مطابقة للحساب اليدوي ١٠٠٪
✓ replay لنفس الجلسة بيدي نفس النتيجة
```

**يسلّم للمرحلة ٢:** `AttendanceRecord` موثوق · القواعد مطبقة ·
roster + aliases نظيفة · نمط الـ WorkflowRun مجرّب

---

### ⏸️ فاصل إجباري — أسبوعين استخدام حقيقي
**متبدأش المرحلة ٢ قبلها.** هتكتشف حاجات مستحيل تظهر في الاختبارات.

---

### المرحلة ٢ — Communication (أسبوع ٨–١٢)
```
✓ رسالة واحدة استحالة تتبعت بدون approval
✓ AntiSpam بيمنع >١ رسالة/شخص/يوم فعليًا
✓ Feedback reminder بيقف تلقائيًا بعد الرد
✓ idempotency: موافقة مرتين = إرسال مرة
✓ كل رسالة ليها سجل: مين وافق، امتى، عىل إيه
```

**يسلّم للمرحلة ٣:** Approval pattern عام · Timeline data ·
Scheduler جاهز لأي job · Intent layer

---

### المرحلة ٣ — Mission Control (أسبوع ١٣–١٧)
```
✓ الشاشة بتعرض بيانات حقيقية من نظام شغال
✓ الأولويات مرتبة بمنطق مفهوم وقابل للشرح
✓ الشات بيشغّل close_session كامل
✓ Daily Brief بيوصل ٧ صباحًا فعليًا
✓ demo كاملة في ٩٠ ثانية
```

---

## ٧. قواعد العمل المشتركة

1. **العقد قبل الكود.** أي مكوّن بيسلّم لتاني يتسلّم schema + مثال + حالات الخطأ
   قبل ما يتكتب سطر.
2. **لا استئناف بدون بوابة.** لو المرحلة ١ عندها auto-match ٧٥٪، متبدأش ٢.
3. **الحقيقة قبل التوسع.** كل مرحلة تتجرب عىل شغل حقيقي أسبوعين قبل التالية.
4. **Backward compatibility.** المرحلة ٣ متغيّرش شكل بيانات المرحلة ١.
   أي تغيير → migration صريح + إعادة حساب.
5. **Feature flags.** كل قدرة جديدة وراء flag تقدر تطفيها من غير deploy.
6. **مفيش secrets في الـ repo.** كله في `.env` وخارج git.

---

## ٨. قرارات محسومة (مش للنقاش دلوقتي)

| القرار | الاختيار | السبب |
|---|---|---|
| Monolith ولا microservices | **Monolith** + خدمة AI منفصلة | ٣ ناس مش هيديروا نظام موزع |
| Sync ولا async | **Async من البداية** | الـ workflows طويلة بطبيعتها |
| مكان الـ AI | **HTTP service منفصلة** | يشتغل مستقل، وقابل للاستبدال |
| WhatsApp | **مؤجل** — Email فقط | الرسمي محتاج موافقات Meta، وغير الرسمي بيتباند |
| Multi-tenant | **`tenant_id` من الآن، بدون تفعيل** | إضافته بعدين مؤلمة |

---

## ٩. بيانات حساسة

المشروع بيتعامل مع أسماء وإيميلات وأرقام موبايل لمتدربين حقيقيين.

- بيانات حقيقية **ممنوعة** في الـ repo أو في الأمثلة
- استخدموا بيانات مموّهة في الاختبارات
- الـ DB عليها access محدود
- أي export بيتسجل في الـ ActivityLog
