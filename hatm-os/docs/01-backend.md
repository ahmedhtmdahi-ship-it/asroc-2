# HATM OS — Backend Implementation Guide

> دليل تنفيذ عملي بالأكواد. اتبعه بالترتيب — كل قسم بيبني عىل اللي قبله.
> **اقرأ `00-Architecture-Shared` الأول.**

---

## الفهرس

```
٠   هيكل المشروع والإعداد
١   Config & Settings
٢   Database Models
٣   Activity Log
٤   Zoom Adapter
٥   Duration Engine        ← منطق خالص
٦   Rules Engine           ← منطق خالص
٧   Sheets Adapter
٨   Workflow Engine        ← قلب النظام
٩   close_session Workflow
١٠  Approval Gate
١١  Template Renderer
١٢  Gmail Adapter
١٣  Anti-Spam Gate
١٤  Celery & Scheduler
١٥  FastAPI Endpoints
١٦  الاختبارات
```

---

# ٠. هيكل المشروع

```
hatm-os/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env.example
├── alembic.ini
├── alembic/
│   └── versions/
└── app/
    ├── main.py                 # FastAPI app
    ├── config.py               # Settings
    ├── db.py                   # Session factory
    ├── celery_app.py           # Celery + Beat
    │
    ├── models/
    │   ├── __init__.py
    │   ├── base.py
    │   ├── program.py
    │   ├── session.py
    │   ├── trainee.py
    │   ├── attendance.py
    │   ├── message.py
    │   ├── approval.py
    │   ├── workflow.py
    │   └── activity.py
    │
    ├── domain/                 # ⚠️ منطق خالص — ممنوع أي I/O هنا
    │   ├── duration.py
    │   ├── rules.py
    │   └── templates.py
    │
    ├── adapters/
    │   ├── base.py             # Interfaces مجردة
    │   ├── zoom.py
    │   ├── sheets.py
    │   ├── gmail.py
    │   └── ai_client.py
    │
    ├── orchestration/
    │   ├── engine.py           # Workflow Engine
    │   ├── registry.py         # تسجيل الـ definitions
    │   ├── approval.py         # Approval Gate
    │   ├── antispam.py
    │   └── flows/
    │       └── close_session.py
    │
    ├── api/
    │   ├── deps.py
    │   ├── sessions.py
    │   ├── reviews.py
    │   ├── approvals.py
    │   ├── dashboard.py
    │   └── command.py
    │
    ├── core/
    │   ├── logging.py          # @logged decorator
    │   ├── errors.py
    │   └── idempotency.py
    │
    └── tasks/
        ├── attendance.py
        ├── followup.py
        └── brief.py

tests/
├── domain/
│   ├── test_duration.py
│   └── test_rules.py
├── adapters/
└── fixtures/
```

**القاعدة الذهبية:** `app/domain/` مفيهاش `import requests` ولا `import sqlalchemy`.
لو لقيت نفسك محتاج، فأنت حاطط الكود في المكان الغلط.

---

## requirements.txt

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
alembic==1.13.3
psycopg[binary]==3.2.3
pydantic==2.9.2
pydantic-settings==2.5.2
celery[redis]==5.4.0
redis==5.1.1
httpx==0.27.2
tenacity==9.0.0
google-api-python-client==2.147.0
google-auth==2.35.0
google-auth-oauthlib==1.2.1
jinja2==3.1.4
python-json-logger==2.0.7
pytest==8.3.3
pytest-asyncio==0.24.0
freezegun==1.5.1
```

---

## docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: hatm
      POSTGRES_USER: hatm
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]
    ports: ["5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hatm"]
      interval: 5s

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    env_file: .env
    volumes: ["./app:/code/app"]
    ports: ["8000:8000"]
    depends_on:
      postgres: {condition: service_healthy}

  worker:
    build: .
    command: celery -A app.celery_app worker -l info -Q default
    env_file: .env
    volumes: ["./app:/code/app"]
    depends_on: [redis, postgres]

  beat:
    build: .
    command: celery -A app.celery_app beat -l info
    env_file: .env
    depends_on: [redis]

  ai:
    build: ../hatm-ai          # مشروع الـ AI Engineer
    ports: ["8100:8100"]

volumes:
  pgdata:
```

---

## Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /code
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

# ١. Config

```python
# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg://hatm:pass@postgres:5432/hatm"
    redis_url: str = "redis://redis:6379/0"

    # Zoom — Server-to-Server OAuth
    zoom_account_id: str
    zoom_client_id: str
    zoom_client_secret: str

    # Google
    google_sa_json: str = "/secrets/service-account.json"

    # AI service
    ai_service_url: str = "http://ai:8100"
    ai_timeout: float = 10.0

    # سلوك النظام
    zoom_report_retry_minutes: int = 20
    zoom_report_max_retries: int = 6
    approval_expiry_hours: int = 72
    antispam_window_hours: int = 24
    antispam_max_messages: int = 1

    # Feature flags
    ff_send_email: bool = False        # ابدأ مقفول
    ff_auto_close_session: bool = False
    ff_whatsapp: bool = False

    timezone: str = "Africa/Cairo"

settings = Settings()
```

```bash
# .env.example
DB_PASSWORD=changeme
DATABASE_URL=postgresql+psycopg://hatm:changeme@postgres:5432/hatm
REDIS_URL=redis://redis:6379/0
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
GOOGLE_SA_JSON=/secrets/service-account.json
AI_SERVICE_URL=http://ai:8100
FF_SEND_EMAIL=false
```

> **Feature flags:** ابدأ `ff_send_email=false`. النظام يجهّز الرسايل ويعرضها
> بس ميبعتش. أول أسبوعين هتكتشف أخطاء كتير — ومحدش هيتأذى.

---

# ٢. Database Models

```python
# app/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

```python
# app/models/program.py
from datetime import date, datetime
from sqlalchemy import String, Date, Integer, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

class Program(Base):
    __tablename__ = "programs"

    id:        Mapped[int]  = mapped_column(primary_key=True)
    tenant_id: Mapped[int]  = mapped_column(Integer, default=1, index=True)
    name:      Mapped[str]  = mapped_column(String(200))
    start_date:Mapped[date]
    drive_folder_id: Mapped[str | None] = mapped_column(String(100))

    # قواعد الحضور — JSONB مش كود
    attendance_rules: Mapped[dict] = mapped_column(JSON, default=dict)

    # ربط الشيت
    attendance_sheet_id:  Mapped[str | None] = mapped_column(String(100))
    attendance_sheet_tab: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    sessions: Mapped[list["Session"]] = relationship(back_populates="program")
    trainees: Mapped[list["Trainee"]] = relationship(back_populates="program")
```

```python
# app/models/session.py
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

class Session(Base):
    __tablename__ = "sessions"

    id:         Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), index=True)
    title:      Mapped[str] = mapped_column(String(200))

    zoom_meeting_id:   Mapped[str | None] = mapped_column(String(50))
    zoom_meeting_uuid: Mapped[str | None] = mapped_column(String(100))

    planned_start: Mapped[datetime]
    planned_end:   Mapped[datetime]
    actual_start:  Mapped[datetime | None]
    actual_end:    Mapped[datetime | None]

    # scheduled | running | needs_review | awaiting_approval | closed | failed
    status: Mapped[str] = mapped_column(String(30), default="scheduled",
                                        index=True)

    program = relationship("Program", back_populates="sessions")

    @property
    def planned_minutes(self) -> float:
        return (self.planned_end - self.planned_start).total_seconds() / 60
```

```python
# app/models/trainee.py
from sqlalchemy import String, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

class Trainee(Base):
    __tablename__ = "trainees"

    id:         Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), index=True)

    name_ar: Mapped[str]        = mapped_column(String(200))
    name_en: Mapped[str | None] = mapped_column(String(200))
    email:   Mapped[str | None] = mapped_column(String(200), index=True)
    phone:   Mapped[str | None] = mapped_column(String(30))

    # ⭐ المفتاح: كل تأكيد يدوي بيتحول لـ alias هنا
    zoom_aliases: Mapped[list] = mapped_column(JSON, default=list)

    status: Mapped[str] = mapped_column(String(20), default="active")

    program = relationship("Program", back_populates="trainees")

    def add_alias(self, alias: str) -> None:
        a = (alias or "").strip()
        if a and a not in self.zoom_aliases:
            # SQLAlchemy مبيرصدش تعديل الليست في مكانها
            self.zoom_aliases = self.zoom_aliases + [a]
```

> ⚠️ **فخ مهم:** `self.zoom_aliases.append(x)` **مش** هيتحفظ في الـ DB.
> لازم تعيد إسناد الليست كاملة زي ما فوق.

```python
# app/models/attendance.py
from datetime import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, JSON, DateTime, \
                       UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("session_id", "trainee_id", name="uq_session_trainee"),
        Index("ix_att_session_status", "session_id", "status"),
    )

    id:         Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), index=True)
    trainee_id: Mapped[int | None] = mapped_column(ForeignKey("trainees.id"))

    zoom_name:  Mapped[str | None] = mapped_column(String(200))
    zoom_email: Mapped[str | None] = mapped_column(String(200))

    # ⭐ خزّن الخام دايمًا — عشان تقدر تعيد الحساب لو غيّرت القواعد
    raw_intervals:    Mapped[list] = mapped_column(JSON, default=list)
    merged_intervals: Mapped[list] = mapped_column(JSON, default=list)

    total_minutes:   Mapped[float] = mapped_column(Float, default=0)
    percentage:      Mapped[float] = mapped_column(Float, default=0)
    first_join:      Mapped[datetime | None]
    last_leave:      Mapped[datetime | None]
    disconnect_count:Mapped[int]   = mapped_column(Integer, default=0)

    # present | late | partial | absent | early_leave | needs_review
    status: Mapped[str] = mapped_column(String(30), default="needs_review")

    match_confidence: Mapped[float]      = mapped_column(Float, default=0)
    match_method:     Mapped[str | None] = mapped_column(String(20))
    needs_review:     Mapped[bool]       = mapped_column(default=False, index=True)
    suggestions:      Mapped[list]       = mapped_column(JSON, default=list)

    reviewed_by: Mapped[str | None]      = mapped_column(String(100))
    reviewed_at: Mapped[datetime | None]
```

```python
# app/models/approval.py
from datetime import datetime, timedelta
from sqlalchemy import String, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(primary_key=True)

    # send_messages | update_sheet | create_program | ...
    type:    Mapped[str]  = mapped_column(String(50), index=True)
    payload: Mapped[dict] = mapped_column(JSON)   # اللي محتاجه للتنفيذ
    preview: Mapped[dict] = mapped_column(JSON)   # اللي بيتعرض لحاتم

    # pending | approved | rejected | expired | executed
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)

    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True)
    workflow_run_id: Mapped[str | None] = mapped_column(String(40), index=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    expires_at: Mapped[datetime]
    decided_by: Mapped[str | None] = mapped_column(String(100))
    decided_at: Mapped[datetime | None]
    reject_reason: Mapped[str | None] = mapped_column(String(500))

    @property
    def is_actionable(self) -> bool:
        return (self.status == "pending"
                and self.expires_at > datetime.utcnow())
```

```python
# app/models/message.py
from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class OutboundMessage(Base):
    __tablename__ = "outbound_messages"

    id:         Mapped[int] = mapped_column(primary_key=True)
    trainee_id: Mapped[int] = mapped_column(ForeignKey("trainees.id"), index=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("sessions.id"))
    approval_id:Mapped[int | None] = mapped_column(ForeignKey("approvals.id"))

    channel:  Mapped[str] = mapped_column(String(20))   # email | whatsapp
    msg_type: Mapped[str] = mapped_column(String(50))   # absence | feedback...

    rendered_subject: Mapped[str | None] = mapped_column(String(300))
    rendered_body:    Mapped[str]        = mapped_column(Text)

    # draft | pending_approval | approved | sent | failed | skipped
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)

    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True)
    provider_id:     Mapped[str | None] = mapped_column(String(200))
    error:           Mapped[str | None] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    sent_at:    Mapped[datetime | None] = mapped_column(index=True)
    replied_at: Mapped[datetime | None]
```

```python
# app/models/workflow.py
import uuid
from datetime import datetime
from sqlalchemy import String, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True,
                                    default=lambda: uuid.uuid4().hex)
    definition:   Mapped[str] = mapped_column(String(50), index=True)

    # running | paused | awaiting_approval | completed | failed | cancelled
    status:       Mapped[str] = mapped_column(String(30), default="running",
                                              index=True)
    current_step: Mapped[str | None] = mapped_column(String(50))

    context:      Mapped[dict] = mapped_column(JSON, default=dict)
    pause_reason: Mapped[str | None] = mapped_column(String(100))
    resume_token: Mapped[str | None] = mapped_column(String(100))

    completed_steps: Mapped[list] = mapped_column(JSON, default=list)
    error:           Mapped[str | None] = mapped_column(String(1000))
    retry_count:     Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(),
                                                 onupdate=func.now())
```

```python
# app/models/activity.py
from datetime import datetime
from sqlalchemy import String, JSON, Integer, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class ActivityLog(Base):
    __tablename__ = "activity_log"
    __table_args__ = (Index("ix_activity_ts", "timestamp"),)

    id: Mapped[int] = mapped_column(primary_key=True)

    actor_type: Mapped[str] = mapped_column(String(20))   # human|system|workflow
    actor_id:   Mapped[str | None] = mapped_column(String(100))

    action:      Mapped[str] = mapped_column(String(100), index=True)
    target_type: Mapped[str | None] = mapped_column(String(50))
    target_id:   Mapped[str | None] = mapped_column(String(50))

    before: Mapped[dict | None] = mapped_column(JSON)
    after:  Mapped[dict | None] = mapped_column(JSON)

    result:      Mapped[str] = mapped_column(String(20))  # success | failure
    error:       Mapped[str | None] = mapped_column(String(1000))
    duration_ms: Mapped[int | None] = mapped_column(Integer)

    workflow_run_id: Mapped[str | None] = mapped_column(String(40), index=True)
    timestamp: Mapped[datetime] = mapped_column(server_default=func.now())
```

### Migrations

```bash
alembic init alembic
# في alembic/env.py:
#   from app.db import Base
#   from app.models import *          ← مهم، عشان يشوف الجداول
#   target_metadata = Base.metadata

alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

---

# ٣. Activity Log Decorator

```python
# app/core/logging.py
import time, functools, contextvars, json
from datetime import datetime
from app.db import SessionLocal
from app.models.activity import ActivityLog

# سياق ينتقل تلقائيًا عبر الاستدعاءات
_actor    = contextvars.ContextVar("actor",    default=("system", None))
_run_id   = contextvars.ContextVar("run_id",   default=None)

def set_actor(actor_type: str, actor_id: str | None = None):
    _actor.set((actor_type, actor_id))

def set_run(run_id: str | None):
    _run_id.set(run_id)

def _safe(obj):
    """تحويل أي حاجة لـ JSON بأمان"""
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return {"repr": str(obj)[:500]}

def logged(action: str, target_type: str | None = None,
           capture_before=None, capture_after=None):
    """
    @logged("update_attendance_sheet", target_type="session")
    def write_attendance(session_id: int, ...): ...

    capture_before/after: دوال اختيارية بتاخد نفس الـ args وترجع dict
    """
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            t0 = time.perf_counter()
            actor_type, actor_id = _actor.get()
            before = None
            if capture_before:
                try:
                    before = _safe(capture_before(*args, **kwargs))
                except Exception:
                    pass

            result, error, ok = None, None, True
            try:
                result = fn(*args, **kwargs)
                return result
            except Exception as e:
                ok, error = False, f"{type(e).__name__}: {e}"[:1000]
                raise
            finally:
                after = None
                if ok and capture_after:
                    try:
                        after = _safe(capture_after(result))
                    except Exception:
                        pass

                db = SessionLocal()
                try:
                    db.add(ActivityLog(
                        actor_type=actor_type, actor_id=actor_id,
                        action=action, target_type=target_type,
                        target_id=str(kwargs.get("session_id")
                                      or (args[0] if args else ""))[:50],
                        before=before, after=after,
                        result="success" if ok else "failure",
                        error=error,
                        duration_ms=int((time.perf_counter() - t0) * 1000),
                        workflow_run_id=_run_id.get(),
                    ))
                    db.commit()
                except Exception:
                    db.rollback()      # اللوج ميوقعش العملية أبدًا
                finally:
                    db.close()
        return wrapper
    return deco
```

**الاستخدام:**

```python
@logged("write_attendance_sheet", target_type="session",
        capture_before=lambda session_id, **k: read_current_sheet(session_id))
def write_attendance_sheet(session_id: int, rows: list):
    ...
```

> ⚠️ الـ log بيستخدم **session منفصلة** عشان لو العملية الأصلية عملت rollback،
> السجل يفضل موجود.

---

# ٤. Zoom Adapter

```python
# app/adapters/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

@dataclass
class RawParticipant:
    name: str
    email: str | None
    user_id: str | None
    join_time: datetime
    leave_time: datetime

@dataclass
class MeetingInstance:
    uuid: str
    start_time: datetime

class MeetingProvider(ABC):
    @abstractmethod
    def list_instances(self, meeting_id: str) -> list[MeetingInstance]: ...

    @abstractmethod
    def fetch_participants(self, meeting_uuid: str) -> list[RawParticipant]: ...
```

```python
# app/adapters/zoom.py
import time, base64, urllib.parse
from datetime import datetime, timezone
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, \
                     retry_if_exception_type
from app.config import settings
from app.adapters.base import MeetingProvider, RawParticipant, MeetingInstance
from app.core.errors import ReportNotReady, ZoomError

BASE = "https://api.zoom.us/v2"

class ZoomAdapter(MeetingProvider):
    def __init__(self):
        self._token: str | None = None
        self._exp: float = 0

    # ── المصادقة ─────────────────────────────────────────────
    def _get_token(self) -> str:
        """Server-to-Server OAuth — التوكن بيعيش ساعة"""
        if self._token and time.time() < self._exp - 60:
            return self._token

        creds = base64.b64encode(
            f"{settings.zoom_client_id}:{settings.zoom_client_secret}".encode()
        ).decode()

        r = httpx.post(
            "https://zoom.us/oauth/token",
            params={"grant_type": "account_credentials",
                    "account_id": settings.zoom_account_id},
            headers={"Authorization": f"Basic {creds}"},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        self._token = data["access_token"]
        self._exp = time.time() + data.get("expires_in", 3600)
        return self._token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._get_token()}"}

    # ── ⭐ الفخ الأول: ترميز الـ UUID ─────────────────────────
    @staticmethod
    def encode_uuid(uuid: str) -> str:
        """
        لو الـ UUID بيبدأ بـ '/' أو فيه '//' لازم double-encode
        وإلا Zoom هيرجّع 404.
        مثال: '/abc//def==' → '%252Fabc%252F%252Fdef%253D%253D'
        """
        if uuid.startswith("/") or "//" in uuid:
            return urllib.parse.quote(urllib.parse.quote(uuid, safe=""),
                                      safe="")
        return urllib.parse.quote(uuid, safe="")

    # ── ⭐ الفخ الثاني: الاجتماع المتكرر ──────────────────────
    def list_instances(self, meeting_id: str) -> list[MeetingInstance]:
        """
        الاجتماع المتكرر بياخد UUID جديد كل مرة.
        لازم تجيب الـ instances الأول عشان تعرف UUID الجلسة المحددة.
        """
        r = httpx.get(f"{BASE}/past_meetings/{meeting_id}/instances",
                      headers=self._headers(), timeout=30)
        if r.status_code == 404:
            return []
        r.raise_for_status()
        return [
            MeetingInstance(
                uuid=m["uuid"],
                start_time=datetime.fromisoformat(
                    m["start_time"].replace("Z", "+00:00")),
            )
            for m in r.json().get("meetings", [])
        ]

    def find_instance(self, meeting_id: str,
                      target_date: datetime) -> MeetingInstance | None:
        """أقرب instance لتاريخ الجلسة (فرق أقل من ٦ ساعات)"""
        best, best_diff = None, None
        for inst in self.list_instances(meeting_id):
            diff = abs((inst.start_time - target_date).total_seconds())
            if best_diff is None or diff < best_diff:
                best, best_diff = inst, diff
        if best and best_diff < 6 * 3600:
            return best
        return None

    # ── ⭐ الفخ الثالث: التقرير متأخر + pagination ────────────
    @retry(stop=stop_after_attempt(3),
           wait=wait_exponential(multiplier=2, min=2, max=20),
           retry=retry_if_exception_type(httpx.HTTPStatusError))
    def _page(self, uuid_enc: str, token: str | None) -> dict:
        params = {"page_size": 300}
        if token:
            params["next_page_token"] = token

        r = httpx.get(f"{BASE}/report/meetings/{uuid_enc}/participants",
                      headers=self._headers(), params=params, timeout=45)

        if r.status_code == 404:
            # التقرير لسه مش جاهز — مش خطأ دائم
            raise ReportNotReady(
                "تقرير Zoom لسه مش متاح",
                retry_after=settings.zoom_report_retry_minutes * 60)
        if r.status_code == 429:
            raise ZoomError("تجاوز حد الطلبات — حاول بعد شوية")
        r.raise_for_status()
        return r.json()

    def fetch_participants(self, meeting_uuid: str) -> list[RawParticipant]:
        enc = self.encode_uuid(meeting_uuid)
        out, token = [], None

        while True:
            data = self._page(enc, token)
            for p in data.get("participants", []):
                # ⚠️ الشخص الواحد بيظهر صفوف متعددة لو خرج ودخل
                if not p.get("join_time") or not p.get("leave_time"):
                    continue
                out.append(RawParticipant(
                    name=(p.get("name") or "").strip(),
                    email=(p.get("user_email") or "").strip().lower() or None,
                    user_id=p.get("id") or None,
                    join_time=datetime.fromisoformat(
                        p["join_time"].replace("Z", "+00:00")),
                    leave_time=datetime.fromisoformat(
                        p["leave_time"].replace("Z", "+00:00")),
                ))
            token = data.get("next_page_token")
            if not token:
                break
            time.sleep(0.3)      # احترام الـ rate limit

        return out
```

```python
# app/core/errors.py
class AppError(Exception):
    code = "APP_ERROR"
    def __init__(self, message: str, **extra):
        super().__init__(message)
        self.message = message
        self.extra = extra

class ReportNotReady(AppError):
    code = "ZOOM_REPORT_NOT_READY"
    def __init__(self, message: str, retry_after: int = 900):
        super().__init__(message, retry_after=retry_after)
        self.retry_after = retry_after

class ZoomError(AppError):
    code = "ZOOM_ERROR"

class SheetError(AppError):
    code = "SHEET_ERROR"

class ApprovalExpired(AppError):
    code = "APPROVAL_EXPIRED"
```

### إعداد Zoom App (خطوة بخطوة)

```
1. marketplace.zoom.us → Develop → Build App → Server-to-Server OAuth
2. Scopes المطلوبة:
   report:read:admin
   meeting:read:admin
   cloud_recording:read:admin   (لو هتنزّل التسجيلات)
3. انسخ: Account ID · Client ID · Client Secret → .env
4. Activate the app
```

---

# ٥. Duration Engine ⭐

> **منطق خالص. مفيش I/O. ده أهم ملف تكتب له اختبارات.**

```python
# app/domain/duration.py
from dataclasses import dataclass
from datetime import datetime

Interval = tuple[datetime, datetime]

@dataclass
class DurationResult:
    total_minutes: float
    merged: list[Interval]
    first_join: datetime | None
    last_leave: datetime | None
    disconnect_count: int

    @property
    def is_empty(self) -> bool:
        return not self.merged


def compute(intervals: list[Interval],
            window_start: datetime,
            window_end: datetime) -> DurationResult:
    """
    بيحسب صافي دقايق الحضور من فترات ممكن تكون متداخلة.

    المشكلة اللي بيحلها:
      نفس الشخص ممكن يظهر بـ ٤ صفوف في تقرير Zoom — فتح موبايل ولابتوب
      في نفس الوقت، أو النت قطع ورجع. لو جمعت الـ duration عادي هتطلع
      أرقام أكبر من مدة الجلسة نفسها.

    الحل: قص عىل حدود الجلسة → ترتيب → دمج المتداخل → جمع.
    """
    # ١) قص كل فترة عىل حدود نافذة الجلسة
    clipped: list[Interval] = []
    for s, e in intervals:
        cs, ce = max(s, window_start), min(e, window_end)
        if ce > cs:
            clipped.append((cs, ce))

    if not clipped:
        return DurationResult(0.0, [], None, None, 0)

    # ٢) ترتيب زمني
    clipped.sort(key=lambda x: x[0])

    # ٣) دمج المتداخل
    merged: list[Interval] = [clipped[0]]
    for s, e in clipped[1:]:
        ls, le = merged[-1]
        if s <= le:                      # فيه تداخل أو تلامس
            merged[-1] = (ls, max(le, e))
        else:
            merged.append((s, e))

    # ٤) الجمع والاستخراج
    total = sum((e - s).total_seconds() for s, e in merged) / 60.0

    return DurationResult(
        total_minutes=round(total, 2),
        merged=merged,
        first_join=merged[0][0],
        last_leave=merged[-1][1],
        # عدد الانقطاعات = عدد الفجوات بين الفترات المدمجة
        disconnect_count=max(0, len(merged) - 1),
    )


def group_by_identity(participants) -> dict[str, list]:
    """
    تجميع صفوف Zoom حسب الهوية.
    الأولوية: email > user_id > الاسم المطبّع.
    """
    groups: dict[str, list] = {}
    for p in participants:
        if p.email:
            key = f"email:{p.email}"
        elif p.user_id:
            key = f"uid:{p.user_id}"
        else:
            key = f"name:{' '.join((p.name or '').lower().split())}"
        groups.setdefault(key, []).append(p)
    return groups
```

### الاختبارات — إلزامية

```python
# tests/domain/test_duration.py
from datetime import datetime as dt
from app.domain.duration import compute

W0, W1 = dt(2026, 8, 17, 18, 0), dt(2026, 8, 17, 20, 0)   # جلسة ساعتين

def I(h1, m1, h2, m2):
    return (dt(2026, 8, 17, h1, m1), dt(2026, 8, 17, h2, m2))

def test_single_full():
    r = compute([I(18,0,20,0)], W0, W1)
    assert r.total_minutes == 120
    assert r.disconnect_count == 0

def test_overlapping_devices():
    """موبايل + لابتوب في نفس الوقت — مينفعش يتجمعوا"""
    r = compute([I(18,0,19,0), I(18,30,19,30)], W0, W1)
    assert r.total_minutes == 90        # مش 120
    assert len(r.merged) == 1

def test_gap_counts_as_disconnect():
    r = compute([I(18,0,18,30), I(19,0,19,30)], W0, W1)
    assert r.total_minutes == 60
    assert r.disconnect_count == 1

def test_touching_intervals_merge():
    """فترتان متلاصقتان = فترة واحدة، مش انقطاع"""
    r = compute([I(18,0,19,0), I(19,0,20,0)], W0, W1)
    assert r.total_minutes == 120
    assert r.disconnect_count == 0

def test_clipped_before_window():
    """دخل قبل ما الجلسة تبدأ رسميًا"""
    r = compute([(dt(2026,8,17,17,30), dt(2026,8,17,19,0))], W0, W1)
    assert r.total_minutes == 60
    assert r.first_join == W0

def test_clipped_after_window():
    r = compute([(dt(2026,8,17,19,0), dt(2026,8,17,21,0))], W0, W1)
    assert r.total_minutes == 60

def test_fully_outside():
    r = compute([(dt(2026,8,17,15,0), dt(2026,8,17,16,0))], W0, W1)
    assert r.total_minutes == 0
    assert r.is_empty

def test_contained_interval():
    """فترة جوه فترة تانية بالكامل"""
    r = compute([I(18,0,20,0), I(18,30,19,0)], W0, W1)
    assert r.total_minutes == 120
    assert len(r.merged) == 1

def test_unsorted_input():
    r = compute([I(19,0,19,30), I(18,0,18,30)], W0, W1)
    assert r.total_minutes == 60
    assert r.first_join == dt(2026,8,17,18,0)

def test_empty():
    r = compute([], W0, W1)
    assert r.total_minutes == 0
    assert r.first_join is None
```

---

# ٦. Rules Engine ⭐

```python
# app/domain/rules.py
from dataclasses import dataclass
from app.domain.duration import DurationResult

DEFAULT_RULES = {
    "basis": "planned_duration",        # أو "actual_duration"
    "late_threshold_min": 15,
    "early_leave_threshold_min": 10,
    "thresholds": [
        {"status": "present", "min_pct": 80},
        {"status": "partial", "min_pct": 50},
        {"status": "absent",  "min_pct": 0},
    ],
    "modifiers": {
        "flag_review_if_disconnects_gt": 3,
    },
}

@dataclass
class Evaluation:
    status: str
    percentage: float
    flags: list[str]

    @property
    def needs_review(self) -> bool:
        return "needs_review" in self.flags


def evaluate(d: DurationResult,
             basis_minutes: float,
             rules: dict | None = None) -> Evaluation:
    """
    دالة خالصة: من نتيجة الحساب + القواعد → الحالة النهائية.

    خالصة يعني: نفس المدخلات = نفس المخرجات، دايمًا.
    ده اللي بيخليك تقدر تعيد حساب جلسات قديمة لو غيّرت القواعد.
    """
    r = {**DEFAULT_RULES, **(rules or {})}
    flags: list[str] = []

    if basis_minutes <= 0:
        return Evaluation("needs_review", 0.0, ["invalid_basis"])

    pct = round(d.total_minutes / basis_minutes * 100, 1)

    # الحالة الأساسية — أول عتبة يتخطاها
    status = "absent"
    for t in sorted(r["thresholds"], key=lambda x: -x["min_pct"]):
        if pct >= t["min_pct"]:
            status = t["status"]
            break

    # المعدّلات
    if status != "absent" and d.first_join:
        # التأخير محسوب من بداية الجلسة (بعد القص، first_join >= window_start)
        pass  # يتحسب في الطبقة اللي فوق حيث window_start متاحة

    if d.disconnect_count > r["modifiers"].get(
            "flag_review_if_disconnects_gt", 99):
        flags.append("many_disconnects")
        flags.append("needs_review")

    return Evaluation(status, pct, flags)


def apply_timing_modifiers(ev: Evaluation, d: DurationResult,
                           window_start, window_end,
                           rules: dict | None = None) -> Evaluation:
    """التأخير والخروج المبكر — محتاجين حدود الجلسة"""
    r = {**DEFAULT_RULES, **(rules or {})}
    if ev.status == "absent" or not d.first_join:
        return ev

    late_min = (d.first_join - window_start).total_seconds() / 60
    early_min = (window_end - d.last_leave).total_seconds() / 60

    status, flags = ev.status, list(ev.flags)

    if late_min > r["late_threshold_min"]:
        flags.append("late")
        if status == "present":
            status = "late"

    if early_min > r["early_leave_threshold_min"]:
        flags.append("early_leave")

    return Evaluation(status, ev.percentage, flags)
```

```python
# tests/domain/test_rules.py
from datetime import datetime as dt
from app.domain.duration import DurationResult
from app.domain.rules import evaluate, apply_timing_modifiers

def mk(minutes, first=None, last=None, disc=0):
    return DurationResult(minutes, [(first or dt(2026,8,17,18,0),
                                     last or dt(2026,8,17,20,0))],
                          first or dt(2026,8,17,18,0),
                          last or dt(2026,8,17,20,0), disc)

def test_present():
    assert evaluate(mk(100), 120).status == "present"    # 83%

def test_partial():
    assert evaluate(mk(70), 120).status == "partial"     # 58%

def test_absent():
    assert evaluate(mk(30), 120).status == "absent"      # 25%

def test_boundary_exactly_80():
    assert evaluate(mk(96), 120).status == "present"     # 80.0%

def test_boundary_just_below():
    assert evaluate(mk(95), 120).status == "partial"     # 79.2%

def test_late():
    d = mk(100, first=dt(2026,8,17,18,20))
    ev = evaluate(d, 120)
    ev = apply_timing_modifiers(ev, d, dt(2026,8,17,18,0),
                                dt(2026,8,17,20,0))
    assert ev.status == "late"

def test_many_disconnects_flags_review():
    ev = evaluate(mk(100, disc=5), 120)
    assert ev.needs_review

def test_custom_rules():
    rules = {"thresholds": [{"status":"present","min_pct":90},
                            {"status":"partial","min_pct":60},
                            {"status":"absent","min_pct":0}]}
    assert evaluate(mk(100), 120, rules).status == "partial"   # 83% < 90
```

---

# ٧. Sheets Adapter

```python
# app/adapters/sheets.py
from dataclasses import dataclass
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from tenacity import retry, stop_after_attempt, wait_exponential, \
                     retry_if_exception_type
from app.config import settings
from app.core.errors import SheetError

SCOPES = ["https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.readonly"]

@dataclass
class CellUpdate:
    row: int          # 1-indexed زي Google Sheets
    col_name: str     # اسم العمود مش رقمه ⭐
    value: str


class SheetsAdapter:
    def __init__(self):
        creds = service_account.Credentials.from_service_account_file(
            settings.google_sa_json, scopes=SCOPES)
        self.svc = build("sheets", "v4", credentials=creds,
                         cache_discovery=False).spreadsheets()

    @retry(stop=stop_after_attempt(4),
           wait=wait_exponential(multiplier=2, min=2, max=30),
           retry=retry_if_exception_type(HttpError))
    def read_range(self, sheet_id: str, rng: str) -> list[list[str]]:
        res = self.svc.values().get(spreadsheetId=sheet_id,
                                    range=rng).execute()
        return res.get("values", [])

    # ── ⭐ الفخ الأساسي: الشيت هيتغير ─────────────────────────
    def header_map(self, sheet_id: str, tab: str) -> dict[str, int]:
        """
        متكتبش عىل 'C5' أبدًا. حد هيضيف عمود والشيت هيبوظ.
        اقرأ صف العناوين واعمل mapping من الاسم للرقم.
        """
        rows = self.read_range(sheet_id, f"{tab}!1:1")
        if not rows:
            raise SheetError(f"صف العناوين فاضي في {tab}")
        return {h.strip(): i for i, h in enumerate(rows[0]) if h.strip()}

    @staticmethod
    def col_letter(idx: int) -> str:
        """0 → A، 25 → Z، 26 → AA"""
        s = ""
        idx += 1
        while idx > 0:
            idx, rem = divmod(idx - 1, 26)
            s = chr(65 + rem) + s
        return s

    def find_row_by_key(self, sheet_id: str, tab: str,
                        key_col: str, key: str) -> int | None:
        """يلاقي رقم الصف بقيمة عمود مفتاحي (زي الإيميل)"""
        hm = self.header_map(sheet_id, tab)
        if key_col not in hm:
            raise SheetError(f"عمود '{key_col}' مش موجود")
        letter = self.col_letter(hm[key_col])
        vals = self.read_range(sheet_id, f"{tab}!{letter}2:{letter}")
        for i, row in enumerate(vals, start=2):
            if row and row[0].strip().lower() == key.strip().lower():
                return i
        return None

    @retry(stop=stop_after_attempt(4),
           wait=wait_exponential(multiplier=2, min=2, max=30),
           retry=retry_if_exception_type(HttpError))
    def batch_write(self, sheet_id: str, tab: str,
                    updates: list[CellUpdate]) -> int:
        """كتابة دفعة واحدة — أسرع بمراحل من خلية خلية"""
        if not updates:
            return 0
        hm = self.header_map(sheet_id, tab)
        data = []
        for u in updates:
            if u.col_name not in hm:
                raise SheetError(f"عمود '{u.col_name}' مش موجود في {tab}")
            a1 = f"{tab}!{self.col_letter(hm[u.col_name])}{u.row}"
            data.append({"range": a1, "values": [[u.value]]})

        res = self.svc.values().batchUpdate(
            spreadsheetId=sheet_id,
            body={"valueInputOption": "USER_ENTERED", "data": data},
        ).execute()
        return res.get("totalUpdatedCells", 0)

    def snapshot(self, sheet_id: str, tab: str,
                 rows: list[int], cols: list[str]) -> dict:
        """لقطة قبل الكتابة — للـ ActivityLog.before والـ rollback"""
        hm = self.header_map(sheet_id, tab)
        out = {}
        for r in rows:
            for c in cols:
                if c in hm:
                    letter = self.col_letter(hm[c])
                    v = self.read_range(sheet_id, f"{tab}!{letter}{r}")
                    out[f"{c}!{r}"] = v[0][0] if v and v[0] else ""
        return out
```

### إعداد Google Service Account

```
1. console.cloud.google.com → New Project
2. APIs & Services → Enable: Google Sheets API, Google Drive API
3. Credentials → Create Service Account → Keys → JSON → نزّله
4. ⭐ افتح الشيت في Drive → Share → حط إيميل الـ service account
   (شكله: xxx@project.iam.gserviceaccount.com) → Editor
   بدون الخطوة دي هترجعلك 403 مهما عملت
```

---

# ٨. Workflow Engine ⭐⭐

> ده أهم قرار معماري. من غيره كل سيناريو بيبقى كود متشابك.

```python
# app/orchestration/engine.py
from dataclasses import dataclass, field
from typing import Callable, Any
from app.db import SessionLocal
from app.models.workflow import WorkflowRun
from app.core.logging import set_run
from app.core.errors import AppError

@dataclass
class Step:
    name: str
    handler: Callable[[dict], dict | None]
    # لو رجّعت PauseSignal، الـ run بيقف
    retryable: bool = False
    max_retries: int = 3


class PauseSignal(Exception):
    """الخطوة بتقول: أنا محتاج تدخل بشري أو انتظار"""
    def __init__(self, reason: str, resume_token: str | None = None,
                 retry_after: int | None = None):
        self.reason = reason
        self.resume_token = resume_token
        self.retry_after = retry_after


@dataclass
class Definition:
    name: str
    steps: list[Step] = field(default_factory=list)

    def step_index(self, name: str) -> int:
        for i, s in enumerate(self.steps):
            if s.name == name:
                return i
        return 0


REGISTRY: dict[str, Definition] = {}

def register(defn: Definition):
    REGISTRY[defn.name] = defn


class WorkflowEngine:
    """
    محرك بسيط ومتعمّد البساطة:
      - خطوات متسلسلة
      - يقدر يقف ويكمل (resumable)
      - كل خطوة idempotent
      - كل transition بيتسجل

    ⚠️ متعمّمهوش زيادة. ٣-٤ سيناريوهات بس.
    """

    def start(self, definition: str, context: dict) -> WorkflowRun:
        db = SessionLocal()
        try:
            run = WorkflowRun(definition=definition, context=context,
                              status="running")
            db.add(run)
            db.commit()
            db.refresh(run)
            run_id = run.id
        finally:
            db.close()
        return self.resume(run_id)

    def resume(self, run_id: str, extra_context: dict | None = None):
        db = SessionLocal()
        try:
            run = db.get(WorkflowRun, run_id)
            if not run:
                raise AppError(f"workflow run {run_id} مش موجود")
            if run.status in ("completed", "cancelled"):
                return run

            defn = REGISTRY[run.definition]
            set_run(run.id)

            if extra_context:
                run.context = {**run.context, **extra_context}

            run.status = "running"
            run.pause_reason = None
            db.commit()

            start_at = 0
            if run.current_step:
                start_at = defn.step_index(run.current_step)
                # لو الخطوة دي خلصت قبل كده، ابدأ من اللي بعدها
                if run.current_step in run.completed_steps:
                    start_at += 1

            for step in defn.steps[start_at:]:
                run.current_step = step.name
                db.commit()

                try:
                    result = step.handler(run.context) or {}
                    run.context = {**run.context, **result}
                    run.completed_steps = run.completed_steps + [step.name]
                    run.retry_count = 0
                    db.commit()

                except PauseSignal as p:
                    run.status = ("awaiting_approval"
                                  if p.reason == "approval"
                                  else "paused")
                    run.pause_reason = p.reason
                    run.resume_token = p.resume_token
                    db.commit()
                    return run

                except Exception as e:
                    if step.retryable and run.retry_count < step.max_retries:
                        run.retry_count += 1
                        run.status = "paused"
                        run.pause_reason = "retry"
                        db.commit()
                        return run
                    run.status = "failed"
                    run.error = f"{step.name}: {type(e).__name__}: {e}"[:1000]
                    db.commit()
                    raise

            run.status = "completed"
            run.current_step = None
            db.commit()
            return run

        finally:
            set_run(None)
            db.close()


engine = WorkflowEngine()
```

**ليه الـ context في الـ DB مش في الذاكرة؟**
لأن الـ run بيقف عند المراجعة والموافقة — ممكن ساعات. لازم يكمل من نفس المكان
بعد restart أو من worker تاني.

---

# ٩. close_session Workflow

```python
# app/orchestration/flows/close_session.py
from datetime import datetime, timedelta
from app.orchestration.engine import Definition, Step, PauseSignal, register
from app.adapters.zoom import ZoomAdapter
from app.adapters.sheets import SheetsAdapter, CellUpdate
from app.adapters.ai_client import AIClient
from app.domain.duration import compute, group_by_identity
from app.domain.rules import evaluate, apply_timing_modifiers
from app.db import SessionLocal
from app.models.session import Session as Sess
from app.models.trainee import Trainee
from app.models.attendance import AttendanceRecord
from app.orchestration.approval import ApprovalGate
from app.core.errors import ReportNotReady
from app.config import settings


# ─────────────────────────────────────────────────────────
def s1_fetch_zoom(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        zoom = ZoomAdapter()

        uuid = sess.zoom_meeting_uuid
        if not uuid:
            inst = zoom.find_instance(sess.zoom_meeting_id,
                                      sess.planned_start)
            if not inst:
                raise PauseSignal("zoom_instance_not_found")
            uuid = inst.uuid
            sess.zoom_meeting_uuid = uuid
            db.commit()

        try:
            parts = zoom.fetch_participants(uuid)
        except ReportNotReady as e:
            # ⭐ التقرير لسه مش جاهز — وقف واستنى، مش فشل
            raise PauseSignal("zoom_report_not_ready",
                              retry_after=e.retry_after)

        return {"participants": [
            {"name": p.name, "email": p.email, "user_id": p.user_id,
             "join": p.join_time.isoformat(), "leave": p.leave_time.isoformat()}
            for p in parts
        ]}
    finally:
        db.close()


# ─────────────────────────────────────────────────────────
def s2_compute_durations(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        ws, we = sess.planned_start, sess.planned_end

        class P:  # كائن خفيف للتجميع
            def __init__(self, d):
                self.name, self.email = d["name"], d["email"]
                self.user_id = d["user_id"]
                self.join = datetime.fromisoformat(d["join"])
                self.leave = datetime.fromisoformat(d["leave"])

        parts = [P(d) for d in ctx["participants"]]
        groups = group_by_identity(parts)

        computed = []
        for key, rows in groups.items():
            res = compute([(r.join, r.leave) for r in rows], ws, we)
            computed.append({
                "key": key,
                "name": rows[0].name,
                "email": rows[0].email,
                "total_minutes": res.total_minutes,
                "merged": [[a.isoformat(), b.isoformat()]
                           for a, b in res.merged],
                "first_join": res.first_join.isoformat()
                              if res.first_join else None,
                "last_leave": res.last_leave.isoformat()
                              if res.last_leave else None,
                "disconnects": res.disconnect_count,
            })
        return {"computed": computed}
    finally:
        db.close()


# ─────────────────────────────────────────────────────────
def s3_match_names(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        roster = db.query(Trainee).filter_by(
            program_id=sess.program_id, status="active").all()

        ai = AIClient()
        res = ai.match(
            session_id=sess.id,
            candidates=[{"idx": i, "name": c["name"], "email": c["email"],
                         "user_id": None}
                        for i, c in enumerate(ctx["computed"])],
            roster=[{"trainee_id": t.id, "name_ar": t.name_ar,
                     "name_en": t.name_en, "email": t.email,
                     "aliases": t.zoom_aliases} for t in roster],
        )

        # حفظ السجلات
        needs_review = 0
        for m in res["matches"]:
            c = ctx["computed"][m["candidate_idx"]]
            rec = AttendanceRecord(
                session_id=sess.id,
                trainee_id=m.get("trainee_id"),
                zoom_name=c["name"], zoom_email=c["email"],
                raw_intervals=[], merged_intervals=c["merged"],
                total_minutes=c["total_minutes"],
                first_join=datetime.fromisoformat(c["first_join"])
                           if c["first_join"] else None,
                last_leave=datetime.fromisoformat(c["last_leave"])
                           if c["last_leave"] else None,
                disconnect_count=c["disconnects"],
                match_confidence=m["confidence"],
                match_method=m["method"],
                needs_review=m["needs_review"],
                suggestions=m.get("suggestions", []),
            )
            db.add(rec)
            if m["needs_review"]:
                needs_review += 1
        db.commit()

        if needs_review:
            sess.status = "needs_review"
            db.commit()
            # ⭐ وقف واستنى المراجعة البشرية
            raise PauseSignal("needs_review")

        return {"matched": True}
    finally:
        db.close()


# ─────────────────────────────────────────────────────────
def s4_evaluate(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        rules = sess.program.attendance_rules or {}
        basis = (sess.planned_minutes if rules.get("basis") != "actual_duration"
                 else ((sess.actual_end - sess.actual_start).total_seconds()/60
                       if sess.actual_end and sess.actual_start
                       else sess.planned_minutes))

        recs = db.query(AttendanceRecord).filter_by(session_id=sess.id).all()
        from app.domain.duration import DurationResult

        for r in recs:
            merged = [(datetime.fromisoformat(a), datetime.fromisoformat(b))
                      for a, b in r.merged_intervals]
            d = DurationResult(r.total_minutes, merged, r.first_join,
                               r.last_leave, r.disconnect_count)
            ev = evaluate(d, basis, rules)
            ev = apply_timing_modifiers(ev, d, sess.planned_start,
                                        sess.planned_end, rules)
            r.status = ev.status
            r.percentage = ev.percentage

        # الغايبين تمامًا — موجودين في الروستر ومش في تقرير Zoom
        present_ids = {r.trainee_id for r in recs if r.trainee_id}
        all_ids = {t.id for t in db.query(Trainee).filter_by(
            program_id=sess.program_id, status="active").all()}
        for tid in all_ids - present_ids:
            db.add(AttendanceRecord(session_id=sess.id, trainee_id=tid,
                                    total_minutes=0, percentage=0,
                                    status="absent", match_method="none"))
        db.commit()
        return {"evaluated": True}
    finally:
        db.close()


# ─────────────────────────────────────────────────────────
def s5_approve_sheet(ctx: dict) -> dict:
    if ctx.get("sheet_approved"):
        return {}                       # idempotent — اتوافق عليه قبل كده

    db = SessionLocal()
    try:
        recs = db.query(AttendanceRecord).filter_by(
            session_id=ctx["session_id"]).all()
        counts: dict[str, int] = {}
        for r in recs:
            counts[r.status] = counts.get(r.status, 0) + 1

        ApprovalGate().create(
            type="update_sheet",
            payload={"session_id": ctx["session_id"]},
            preview={"summary": f"تحديث شيت الحضور — {len(recs)} صف",
                     "counts": counts},
            workflow_run_id=ctx.get("_run_id"),
        )
        raise PauseSignal("approval", resume_token="sheet")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────
def s6_write_sheet(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        prog = sess.program
        if not prog.attendance_sheet_id:
            return {"sheet_skipped": True}

        sh = SheetsAdapter()
        tab = prog.attendance_sheet_tab or "Attendance"
        col = f"S{sess.id}"          # عمود لكل جلسة

        recs = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == sess.id,
            AttendanceRecord.trainee_id.isnot(None)).all()

        updates = []
        for r in recs:
            t = db.get(Trainee, r.trainee_id)
            if not t or not t.email:
                continue
            row = sh.find_row_by_key(prog.attendance_sheet_id, tab,
                                     "Email", t.email)
            if row:
                updates.append(CellUpdate(row, col,
                                          f"{r.status} ({r.percentage}%)"))

        n = sh.batch_write(prog.attendance_sheet_id, tab, updates)
        sess.status = "closed"
        db.commit()
        return {"cells_written": n}
    finally:
        db.close()


# ─────────────────────────────────────────────────────────
register(Definition(
    name="close_session",
    steps=[
        Step("fetch_zoom",        s1_fetch_zoom, retryable=True, max_retries=6),
        Step("compute_durations", s2_compute_durations),
        Step("match_names",       s3_match_names),
        Step("evaluate",          s4_evaluate),
        Step("approve_sheet",     s5_approve_sheet),
        Step("write_sheet",       s6_write_sheet),
        # المرحلة ٢ بتضيف هنا:
        # Step("compose_messages", ...),
        # Step("approve_messages", ...),
        # Step("send_messages",    ...),
    ],
))
```

---

# ١٠. Approval Gate ⭐

```python
# app/orchestration/approval.py
import hashlib, json
from datetime import datetime, timedelta
from app.db import SessionLocal
from app.models.approval import Approval
from app.config import settings
from app.core.errors import ApprovalExpired, AppError

class ApprovalGate:
    """
    كل فعل بيخرج للعالم الحقيقي بيمر من هنا.
    عام بالتصميم — مش خاص بالرسايل.
    """

    @staticmethod
    def _key(type_: str, payload: dict) -> str:
        raw = f"{type_}:{json.dumps(payload, sort_keys=True)}"
        return hashlib.sha256(raw.encode()).hexdigest()[:40]

    def create(self, type: str, payload: dict, preview: dict,
               workflow_run_id: str | None = None) -> Approval:
        key = self._key(type, payload)
        db = SessionLocal()
        try:
            # ⭐ idempotent — نفس الطلب مبيعملش موافقتين
            existing = db.query(Approval).filter_by(idempotency_key=key).first()
            if existing:
                return existing

            a = Approval(
                type=type, payload=payload, preview=preview,
                idempotency_key=key, workflow_run_id=workflow_run_id,
                expires_at=datetime.utcnow() + timedelta(
                    hours=settings.approval_expiry_hours),
            )
            db.add(a)
            db.commit()
            db.refresh(a)
            return a
        finally:
            db.close()

    def decide(self, approval_id: int, approved: bool,
               actor: str, reason: str | None = None) -> Approval:
        db = SessionLocal()
        try:
            a = db.get(Approval, approval_id)
            if not a:
                raise AppError("الموافقة مش موجودة")

            # ⭐ الحماية من الضغط المزدوج
            if a.status != "pending":
                return a               # اتقرر قبل كده — مبنعملش حاجة

            if a.expires_at <= datetime.utcnow():
                a.status = "expired"
                db.commit()
                raise ApprovalExpired("الموافقة انتهت صلاحيتها")

            a.status = "approved" if approved else "rejected"
            a.decided_by = actor
            a.decided_at = datetime.utcnow()
            a.reject_reason = reason
            db.commit()
            db.refresh(a)
            return a
        finally:
            db.close()

    def patch_payload(self, approval_id: int, new_payload: dict) -> Approval:
        """تعديل قبل الموافقة — بيرجّعها pending"""
        db = SessionLocal()
        try:
            a = db.get(Approval, approval_id)
            if a.status != "pending":
                raise AppError("مينفعش تعدّل موافقة اتقررت")
            a.payload = new_payload
            a.idempotency_key = self._key(a.type, new_payload)
            db.commit()
            db.refresh(a)
            return a
        finally:
            db.close()
```

**بعد الموافقة، مين بيكمّل الـ workflow؟**

```python
# app/api/approvals.py — مقتطف
@router.post("/{approval_id}/approve")
def approve(approval_id: int, actor: str = Depends(current_user)):
    a = ApprovalGate().decide(approval_id, True, actor)
    if a.workflow_run_id:
        # ⭐ استكمال في الخلفية، مش في الـ request
        resume_workflow.delay(a.workflow_run_id,
                              {f"{a.payload.get('stage','sheet')}_approved": True})
    return {"status": a.status}
```

---

# ١١. Template Renderer

```python
# app/domain/templates.py
from dataclasses import dataclass
from jinja2 import Environment, StrictUndefined, TemplateError
from app.core.errors import AppError

# StrictUndefined = يرمي خطأ لو متغير ناقص
# ⭐ ده بيمنع إرسال "أهلاً {{name}}" حرفيًا لمتدرب
_env = Environment(undefined=StrictUndefined, autoescape=False)

@dataclass
class Rendered:
    subject: str | None
    body: str

def render(template_body: str, variables: dict,
           template_subject: str | None = None) -> Rendered:
    try:
        body = _env.from_string(template_body).render(**variables).strip()
        subject = (_env.from_string(template_subject).render(**variables).strip()
                   if template_subject else None)
    except TemplateError as e:
        raise AppError(f"خطأ في القالب: {e}")

    if not body:
        raise AppError("الرسالة فاضية بعد الـ render")
    return Rendered(subject, body)


TEMPLATES = {
    "absence": {
        "subject": "غيابك عن جلسة {{ session_title }}",
        "body": """أهلاً {{ name }}،

لاحظنا غيابك عن جلسة {{ session_title }} بتاريخ {{ session_date }}.

لو فيه ظرف منعك، ابعتلنا رد عىل الرسالة دي.
الجلسة الجاية: {{ next_session | default("سيتم الإعلان عنها") }}

تحياتنا،
فريق {{ program_name }}""",
    },
    "partial": {
        "subject": "حضورك الجزئي — {{ session_title }}",
        "body": """أهلاً {{ name }}،

سجّلنا حضورك {{ percentage }}% من جلسة {{ session_title }}
({{ minutes }} دقيقة من أصل {{ total_minutes }}).

الحد الأدنى للحضور {{ min_required }}%.

تحياتنا،
فريق {{ program_name }}""",
    },
    "feedback": {
        "subject": "رأيك يهمنا — {{ session_title }}",
        "body": """أهلاً {{ name }}،

ياريت تملالنا استمارة التقييم دي، مش هتاخد أكتر من دقيقتين:
{{ form_url }}

شكرًا،
فريق {{ program_name }}""",
    },
}
```

```python
# tests/domain/test_templates.py
import pytest
from app.domain.templates import render, TEMPLATES
from app.core.errors import AppError

def test_render_ok():
    t = TEMPLATES["absence"]
    r = render(t["body"], {"name": "أحمد", "session_title": "React",
                           "session_date": "١٧ أغسطس",
                           "program_name": "برنامج React"},
               t["subject"])
    assert "أحمد" in r.body
    assert "{{" not in r.body            # ⭐ مفيش متغيرات ناقصة

def test_missing_variable_raises():
    """أهم اختبار — متغير ناقص لازم يفشل، مش يتبعت حرفيًا"""
    with pytest.raises(AppError):
        render("أهلاً {{ name }} في {{ missing }}", {"name": "أحمد"})
```

---

# ١٢. Gmail Adapter

```python
# app/adapters/gmail.py
import base64
from email.mime.text import MIMEText
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.compose"]

class GmailAdapter:
    def __init__(self, sender: str):
        creds = service_account.Credentials.from_service_account_file(
            settings.google_sa_json, scopes=SCOPES,
        ).with_subject(sender)     # ⭐ Domain-wide delegation مطلوب
        self.svc = build("gmail", "v1", credentials=creds,
                         cache_discovery=False).users()
        self.sender = sender

    def _mime(self, to: str, subject: str, body: str) -> dict:
        msg = MIMEText(body, "plain", "utf-8")   # ⭐ utf-8 للعربي
        msg["To"], msg["From"], msg["Subject"] = to, self.sender, subject
        return {"raw": base64.urlsafe_b64encode(msg.as_bytes()).decode()}

    def create_draft(self, to: str, subject: str, body: str) -> str:
        d = self.svc.drafts().create(
            userId="me", body={"message": self._mime(to, subject, body)}
        ).execute()
        return d["id"]

    def send(self, to: str, subject: str, body: str) -> str:
        try:
            r = self.svc.messages().send(
                userId="me", body=self._mime(to, subject, body)).execute()
            return r["id"]
        except HttpError as e:
            raise
```

> **Domain-wide delegation:** لازم أدمن الـ Workspace يفوّض الـ service account
> بالـ scopes دي من Admin Console → Security → API Controls.
> من غيرها هترجعلك 403 وأنت مش فاهم ليه.

---

# ١٣. Anti-Spam Gate ⭐

```python
# app/orchestration/antispam.py
from datetime import datetime, timedelta
from sqlalchemy import func
from app.db import SessionLocal
from app.models.message import OutboundMessage
from app.config import settings

class AntiSpamGate:
    """
    ⚠️ كل إرسال لازم يعدي من هنا. من غير استثناء.
    لو سبته موزع في الكود، هتنساه في مكان — وحد هياخد ٥ رسايل في يوم.
    """

    @staticmethod
    def check(trainee_id: int) -> tuple[bool, str | None]:
        db = SessionLocal()
        try:
            since = datetime.utcnow() - timedelta(
                hours=settings.antispam_window_hours)
            n = db.query(func.count(OutboundMessage.id)).filter(
                OutboundMessage.trainee_id == trainee_id,
                OutboundMessage.sent_at >= since,
                OutboundMessage.status == "sent",
            ).scalar() or 0

            if n >= settings.antispam_max_messages:
                return False, (f"اتبعتله {n} رسالة في آخر "
                               f"{settings.antispam_window_hours} ساعة")
            return True, None
        finally:
            db.close()

    @classmethod
    def filter_batch(cls, trainee_ids: list[int]) -> tuple[list, list]:
        """يرجّع (المسموح، المؤجل مع السبب)"""
        allowed, blocked = [], []
        for tid in trainee_ids:
            ok, reason = cls.check(tid)
            (allowed if ok else blocked).append(
                tid if ok else {"trainee_id": tid, "reason": reason})
        return allowed, blocked
```

---

# ١٤. Celery & Scheduler

```python
# app/celery_app.py
from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery = Celery("hatm", broker=settings.redis_url,
                backend=settings.redis_url)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    timezone=settings.timezone,
    enable_utc=True,
    task_acks_late=True,              # ⭐ لو الـ worker مات، المهمة ترجع
    worker_prefetch_multiplier=1,
    task_track_started=True,
)

celery.conf.beat_schedule = {
    "check-pending-zoom-reports": {
        "task": "tasks.check_zoom_reports",
        "schedule": crontab(minute="*/15"),
    },
    "feedback-reminders": {
        "task": "tasks.feedback_reminders",
        "schedule": crontab(minute=0),          # كل ساعة
    },
    "daily-brief": {
        "task": "tasks.daily_brief",
        "schedule": crontab(hour=7, minute=0),
    },
    "end-of-day-summary": {
        "task": "tasks.end_of_day",
        "schedule": crontab(hour=21, minute=0),
    },
    "expire-approvals": {
        "task": "tasks.expire_approvals",
        "schedule": crontab(minute=30),
    },
}

import app.tasks.attendance   # noqa — تسجيل المهام
import app.tasks.followup     # noqa
import app.tasks.brief        # noqa
```

```python
# app/tasks/attendance.py
from datetime import datetime, timedelta
from app.celery_app import celery
from app.db import SessionLocal
from app.models.workflow import WorkflowRun
from app.orchestration.engine import engine
from app.core.logging import set_actor

@celery.task(name="tasks.resume_workflow", bind=True, max_retries=3)
def resume_workflow(self, run_id: str, extra: dict | None = None):
    set_actor("system", "scheduler")
    try:
        engine.resume(run_id, extra)
    except Exception as e:
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@celery.task(name="tasks.check_zoom_reports")
def check_zoom_reports():
    """
    الـ runs اللي واقفة مستنية تقرير Zoom — جرّب تاني.
    Zoom بيتأخر ١٥-٣٠ دقيقة بعد الجلسة.
    """
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(minutes=15)
        runs = db.query(WorkflowRun).filter(
            WorkflowRun.status == "paused",
            WorkflowRun.pause_reason.in_(["zoom_report_not_ready", "retry"]),
            WorkflowRun.updated_at <= cutoff,
        ).limit(20).all()

        for r in runs:
            resume_workflow.delay(r.id)
    finally:
        db.close()


@celery.task(name="tasks.expire_approvals")
def expire_approvals():
    from app.models.approval import Approval
    db = SessionLocal()
    try:
        db.query(Approval).filter(
            Approval.status == "pending",
            Approval.expires_at <= datetime.utcnow(),
        ).update({"status": "expired"}, synchronize_session=False)
        db.commit()
    finally:
        db.close()
```

---

# ١٥. FastAPI Endpoints

```python
# app/main.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.errors import AppError
from app.api import sessions, reviews, approvals, dashboard, command

app = FastAPI(title="HATM OS API", version="0.1.0")

@app.exception_handler(AppError)
def app_error_handler(request: Request, exc: AppError):
    """شكل أخطاء موحّد — زي ما في العقد مع الـ Frontend"""
    return JSONResponse(
        status_code=400,
        content={"error": {"code": exc.code, "message": exc.message,
                           **exc.extra}},
    )

app.include_router(sessions.router,  prefix="/api/sessions",  tags=["sessions"])
app.include_router(reviews.router,   prefix="/api/reviews",   tags=["reviews"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["approvals"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(command.router,   prefix="/api",           tags=["command"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

```python
# app/api/sessions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from app.db import get_db
from app.models.session import Session as Sess
from app.models.attendance import AttendanceRecord
from app.models.trainee import Trainee
from app.orchestration.engine import engine
from app.core.logging import set_actor

router = APIRouter()

@router.get("")
def list_sessions(status: str | None = None, program_id: int | None = None,
                  db: DBSession = Depends(get_db)):
    q = db.query(Sess)
    if status:
        q = q.filter(Sess.status == status)
    if program_id:
        q = q.filter(Sess.program_id == program_id)
    rows = q.order_by(Sess.planned_start.desc()).limit(50).all()
    return [{"id": s.id, "title": s.title, "status": s.status,
             "date": s.planned_start.isoformat(),
             "program_id": s.program_id} for s in rows]


@router.get("/{session_id}/attendance")
def attendance(session_id: int, db: DBSession = Depends(get_db)):
    recs = db.query(AttendanceRecord).filter_by(session_id=session_id).all()
    out = []
    for r in recs:
        t = db.get(Trainee, r.trainee_id) if r.trainee_id else None
        out.append({
            "id": r.id,
            "trainee_id": r.trainee_id,
            "name": t.name_ar if t else r.zoom_name,
            "zoom_name": r.zoom_name,
            "minutes": r.total_minutes,
            "percentage": r.percentage,
            "status": r.status,
            "disconnects": r.disconnect_count,
            "match_method": r.match_method,
            "needs_review": r.needs_review,
        })
    return {"session_id": session_id, "records": out}


@router.post("/{session_id}/close")
def close_session(session_id: int, db: DBSession = Depends(get_db)):
    s = db.get(Sess, session_id)
    if not s:
        raise HTTPException(404, "الجلسة مش موجودة")
    set_actor("human", "hatem")
    run = engine.start("close_session", {"session_id": session_id})
    return {"run_id": run.id, "status": run.status,
            "pause_reason": run.pause_reason}
```

```python
# app/api/reviews.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession
from datetime import datetime
from app.db import get_db
from app.models.attendance import AttendanceRecord
from app.models.trainee import Trainee
from app.models.workflow import WorkflowRun
from app.tasks.attendance import resume_workflow

router = APIRouter()

class ConfirmIn(BaseModel):
    trainee_id: int

@router.get("/pending")
def pending(db: DBSession = Depends(get_db)):
    recs = db.query(AttendanceRecord).filter_by(needs_review=True).all()
    return {"reviews": [{
        "review_id": r.id,
        "session_id": r.session_id,
        "zoom_name": r.zoom_name,
        "zoom_email": r.zoom_email,
        "total_minutes": r.total_minutes,
        "merged_intervals": r.merged_intervals,
        "suggestions": r.suggestions,
    } for r in recs]}


@router.post("/{review_id}/confirm")
def confirm(review_id: int, body: ConfirmIn, db: DBSession = Depends(get_db)):
    r = db.get(AttendanceRecord, review_id)
    r.trainee_id = body.trainee_id
    r.needs_review = False
    r.match_confidence = 1.0
    r.match_method = "manual"
    r.reviewed_by = "hatem"
    r.reviewed_at = datetime.utcnow()

    # ⭐ التعلّم: كل تأكيد بيتحول لـ alias
    t = db.get(Trainee, body.trainee_id)
    if t and r.zoom_name:
        t.add_alias(r.zoom_name)
    db.commit()

    # لو مفيش مراجعات تانية في الجلسة، كمّل الـ workflow
    left = db.query(AttendanceRecord).filter_by(
        session_id=r.session_id, needs_review=True).count()
    if left == 0:
        run = db.query(WorkflowRun).filter(
            WorkflowRun.status == "paused",
            WorkflowRun.pause_reason == "needs_review",
            WorkflowRun.context["session_id"].as_integer() == r.session_id,
        ).first()
        if run:
            resume_workflow.delay(run.id)

    return {"ok": True, "remaining": left}
```

```python
# app/api/approvals.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession
from app.db import get_db
from app.models.approval import Approval
from app.orchestration.approval import ApprovalGate
from app.tasks.attendance import resume_workflow

router = APIRouter()

class RejectIn(BaseModel):
    reason: str | None = None

@router.get("")
def list_approvals(status: str = "pending", db: DBSession = Depends(get_db)):
    rows = db.query(Approval).filter_by(status=status)\
             .order_by(Approval.created_at.desc()).limit(50).all()
    return {"approvals": [{
        "id": a.id, "type": a.type, "preview": a.preview,
        "created_at": a.created_at.isoformat(),
        "expires_at": a.expires_at.isoformat(),
    } for a in rows]}


@router.post("/{approval_id}/approve")
def approve(approval_id: int):
    a = ApprovalGate().decide(approval_id, True, actor="hatem")
    if a.workflow_run_id and a.status == "approved":
        resume_workflow.delay(a.workflow_run_id, {"sheet_approved": True})
    return {"status": a.status}


@router.post("/{approval_id}/reject")
def reject(approval_id: int, body: RejectIn):
    a = ApprovalGate().decide(approval_id, False, actor="hatem",
                              reason=body.reason)
    return {"status": a.status}
```

```python
# app/adapters/ai_client.py
import httpx
from app.config import settings
from app.core.errors import AppError

class AIClient:
    def match(self, session_id: int, candidates: list, roster: list) -> dict:
        try:
            r = httpx.post(f"{settings.ai_service_url}/match",
                           json={"session_id": session_id,
                                 "candidates": candidates, "roster": roster},
                           timeout=settings.ai_timeout)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise AppError(f"خدمة المطابقة مش متاحة: {e}")

    def parse(self, text: str, context: dict) -> dict:
        r = httpx.post(f"{settings.ai_service_url}/parse",
                       json={"text": text, "context": context},
                       timeout=settings.ai_timeout)
        r.raise_for_status()
        return r.json()
```

---

# ١٦. الاختبارات

```python
# tests/conftest.py
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base

@pytest.fixture
def db():
    eng = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(eng)
    S = sessionmaker(bind=eng)
    s = S()
    yield s
    s.close()

@pytest.fixture
def zoom_report():
    """تقرير Zoom حقيقي مموّه — نفس الشخص بـ ٣ صفوف"""
    return [
        {"name": "أحمد محمد", "user_email": "ahmed@x.com",
         "join_time": "2026-08-17T18:02:00Z",
         "leave_time": "2026-08-17T19:10:00Z"},
        {"name": "أحمد محمد", "user_email": "ahmed@x.com",
         "join_time": "2026-08-17T19:15:00Z",
         "leave_time": "2026-08-17T20:00:00Z"},
        {"name": "Ahmed's iPhone", "user_email": "ahmed@x.com",
         "join_time": "2026-08-17T18:30:00Z",
         "leave_time": "2026-08-17T19:00:00Z"},   # ← تداخل
    ]
```

```bash
# التشغيل
pytest tests/ -v
pytest tests/domain/ -v --cov=app/domain --cov-report=term-missing
```

**التغطية المستهدفة:**

| الملف | الهدف |
|---|---|
| `app/domain/*` | **٩٥٪+** — منطق خالص، مفيش عذر |
| `app/orchestration/*` | ٧٠٪+ |
| `app/adapters/*` | ٤٠٪ (mock الـ APIs) |

---

# خطة أول ٦ أسابيع

| أسبوع | المهام | معيار الإنجاز |
|---|---|---|
| **١** | هيكل المشروع · docker-compose · config · models · migrations · ActivityLog · OpenAPI spec | `docker compose up` شغال · الـ AI والـ React ماشيين مستقلين |
| **٢** | ZoomAdapter كامل · اختبار عىل جلسة حقيقية | تنزيل تقرير جلسة فعلية بنجاح |
| **٣** | Duration Engine + كل الاختبارات | ١٠ اختبارات ناجحة · تطابق الحساب اليدوي |
| **٤** | Rules Engine · SheetsAdapter · snapshot/rollback | كتابة تجريبية في شيت نسخة |
| **٥** | Workflow Engine · close_session · Approval Gate | الـ run بيقف عند المراجعة ويكمّل |
| **٦** | تكامل مع خدمة الـ AI · API endpoints · **جلسة حقيقية end-to-end** | 🚪 بوابة المرحلة ١ |

---

# ⚠️ تحذيرات من واقع التنفيذ

**١. `ff_send_email=false` لأول أسبوعين.** النظام يجهّز ويعرض بس ميبعتش.
هتكتشف أخطاء كتير — ومحدش هيتأذى.

**٢. الـ Workflow Engine ممكن يبلعك شهر.** ٣ سيناريوهات وبس. أي تعميم زيادة
= وقت ضايع.

**٣. اختبر عىل نسخة من الشيت مش الأصلي.** أول كتابة غلط في شيت حقيقي
هتكلفك يوم استرجاع.

**٤. الـ `zoom_aliases` هو أكبر مكسب طويل المدى.** كل تأكيد يدوي بيقلل الشغل
اليدوي الجاي. متنساش `add_alias` في endpoint المراجعة.

**٥. متعملش optimistic writes.** اقرأ → snapshot → اكتب → تحقق. الأبطأ أأمن.
