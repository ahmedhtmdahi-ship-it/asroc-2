import os
from datetime import datetime, timedelta

os.environ.update({
    "DATABASE_URL": "sqlite:///:memory:",
    "REDIS_URL": "redis://127.0.0.1:1/0",
    "ADAPTER_MODE": "fake",
    "CELERY_EAGER": "true",
    "FF_SEND_EMAIL": "false",
    "API_TOKEN": "",
    "AI_SERVICE_URL": "http://ai-stub",
})

import pytest  # noqa: E402

from app.adapters import factory  # noqa: E402
from app.adapters.base import IntelligenceProvider  # noqa: E402
from app.adapters.fake import FakeGmailAdapter, FakeSheetsAdapter, FakeZoomAdapter  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import *  # noqa: E402,F401,F403
from app.models.program import Program  # noqa: E402
from app.models.session import Session as Sess  # noqa: E402
from app.models.trainee import Trainee  # noqa: E402

ROSTER = [
    ("أحمد محمد علي", "Ahmed Mohamed Ali", "ahmed.ali@example.com"),
    ("أحمد محمود حسن", "Ahmed Mahmoud", "a.mahmoud@example.com"),
    ("أحمد مصطفى", "Ahmed Mostafa", "a.mostafa@example.com"),
    ("سارة عبدالله", "Sara Abdallah", "sara.a@example.com"),
    ("محمد علي", "Mohamed Ali", "m.ali@example.com"),
    ("محمد علي حسن", "Mohamed Ali Hassan", "m.ali.h@example.com"),
    ("نورهان سيد", "Nourhan Sayed", "nourhan@example.com"),
    ("يوسف إبراهيم", "Youssef Ibrahim", "youssef@example.com"),
    ("مريم خالد", "Mariam Khaled", "mariam@example.com"),
    ("عمر فاروق", "Omar Farouk", "omar.f@example.com"),
    ("هدير رمضان", "Hadeer Ramadan", "hadeer@example.com"),
    ("كريم سامي", "Karim Samy", "karim@example.com"),
    ("فاطمة الزهراء", "Fatma Elzahraa", "fatma@example.com"),
    ("مصطفى جمال", "Mostafa Gamal", "mostafa.g@example.com"),
    ("ندى أشرف", "Nada Ashraf", "nada@example.com"),
    ("عبدالرحمن طارق", "Abdelrahman Tarek", "abdo.t@example.com"),
    ("رنا محسن", "Rana Mohsen", "rana@example.com"),
    ("إسلام عادل", "Islam Adel", "islam@example.com"),
    ("منة الله حسام", "Menna Hossam", "menna@example.com"),
    ("بلال عصام", "Bilal Essam", "bilal@example.com"),
    ("شروق ناصر", "Shorouk Nasser", "shorouk@example.com"),
    ("زياد وائل", "Ziad Wael", "ziad@example.com"),
    ("آية مجدي", "Aya Magdy", "aya@example.com"),
    ("حسام الدين", "Hossam Eldin", "hossam@example.com"),
]


class StubAI(IntelligenceProvider):
    """Deterministic stand-in for the AI service: email → match, alias → match, else review."""

    def match(self, session_id, candidates, roster):
        by_email = {r["email"].lower(): r for r in roster if r.get("email")}
        by_alias = {}
        for r in roster:
            for a in r.get("aliases") or []:
                by_alias[a.strip().lower()] = r
        matches, auto, review = [], 0, 0
        for c in candidates:
            r = by_email.get((c.get("email") or "").lower())
            method = "email"
            if not r:
                r = by_alias.get((c.get("name") or "").strip().lower())
                method = "alias"
            if r:
                matches.append({"candidate_idx": c["idx"], "trainee_id": r["trainee_id"],
                                "confidence": 1.0, "method": method, "needs_review": False,
                                "suggestions": []})
                auto += 1
            else:
                sugg = [{"trainee_id": x["trainee_id"], "score": 0.5, "reason": "stub"}
                        for x in roster[:2]]
                matches.append({"candidate_idx": c["idx"], "trainee_id": None, "confidence": 0.5,
                                "method": "fuzzy", "needs_review": True, "suggestions": sugg})
                review += 1
        return {"matches": matches, "stats": {"auto_matched": auto, "needs_review": review,
                                              "unmatched": 0}}

    def parse(self, text, context):
        t = text.lower()
        if "اقفل" in t or "close" in t:
            sessions = context.get("recent_sessions", [])
            sid = sessions[0]["id"] if len(sessions) == 1 else None
            return {"intent": "close_session", "entities": {"session_id": sid},
                    "confidence": 0.9, "clarification_needed": None}
        if "تذكير" in t:
            return {"intent": "send_reminders", "entities": {}, "confidence": 0.9,
                    "clarification_needed": None}
        if "ملخص" in t:
            return {"intent": "daily_brief", "entities": {}, "confidence": 0.9,
                    "clarification_needed": None}
        return {"intent": "unknown", "entities": {}, "confidence": 0.2, "clarification_needed": None}


@pytest.fixture(autouse=True)
def fresh_db(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(factory, "intelligence_provider", lambda: StubAI())
    FakeZoomAdapter.report_ready = True
    FakeSheetsAdapter.store.clear()
    FakeSheetsAdapter.writes.clear()
    FakeGmailAdapter.reset()
    from app.api import approvals as approvals_api
    approvals_api._continued.clear()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db():
    s = SessionLocal()
    yield s
    s.close()


@pytest.fixture
def seeded(db):
    """One program, full roster, one past session with a fake sheet."""
    prog = Program(name="React", attendance_rules={}, attendance_sheet_id="sheet-1",
                   attendance_sheet_tab="Attendance", feedback_form_url="https://forms.example/x")
    db.add(prog)
    db.flush()
    trainees = [Trainee(program_id=prog.id, name_ar=ar, name_en=en, email=em) for ar, en, em in ROSTER]
    db.add_all(trainees)
    start = datetime(2026, 8, 17, 16, 0)     # 18:00 Cairo
    sess = Sess(program_id=prog.id, title="React", planned_start=start,
                planned_end=start + timedelta(hours=2), zoom_meeting_id="81244710932")
    db.add(sess)
    db.commit()
    FakeSheetsAdapter.seed("sheet-1", "Attendance", ["Name", "Email"],
                           [[ar, em] for ar, _, em in ROSTER])
    return {"program": prog, "session": sess, "trainees": trainees, "start": start}


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import app
    with TestClient(app) as c:
        yield c
