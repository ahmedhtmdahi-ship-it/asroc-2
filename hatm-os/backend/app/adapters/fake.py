"""In-memory adapters for demo / tests. Selected with ADAPTER_MODE=fake.

The fake Zoom report mirrors the prototype: duplicate rows, overlapping devices,
an English transliteration, a nickname with a dot, and two people who never joined.
"""
import uuid
from datetime import datetime, timedelta

from app.adapters.base import (
    CellUpdate,
    MailProvider,
    MeetingInstance,
    MeetingProvider,
    RawParticipant,
    SheetProvider,
)
from app.core.errors import SheetError

# name, email, join offset (min from planned start), leave offset
FAKE_ZOOM_ROWS: list[tuple[str, str | None, int, int]] = [
    ("أحمد محمد علي", "ahmed.ali@example.com", -2, 120),
    ("احمد م.", None, 3, 72), ("احمد م.", None, 80, 107),           # ambiguous, 2 rows
    ("Ahmed Mostafa", None, 0, 120),                                 # transliteration
    ("sara", "sara.a@example.com", 5, 60), ("Sara's iPhone", "sara.a@example.com", 30, 100),
    ("محمد علي", None, 0, 120),                                       # two similar in roster
    ("Nourhan", "nourhan@example.com", 22, 120),                     # late
    ("يوسف إبراهيم", "youssef@example.com", 0, 40),                    # partial
    ("مريم خالد", "mariam@example.com", 0, 120),
    ("عمر فاروق", "omar.f@example.com", 1, 120),
    ("هدير", "hadeer@example.com", 0, 70), ("هدير", "hadeer@example.com", 74, 90),
    ("هدير", "hadeer@example.com", 93, 120),
    ("كريم سامي", "karim@example.com", 0, 120),
    ("فاطمة الزهراء", "fatma@example.com", 0, 120),
    ("مصطفى جمال", "mostafa.g@example.com", 0, 115),
    ("ندى أشرف", "nada@example.com", 2, 120),
    ("عبدالرحمن", "abdo.t@example.com", 0, 65),                       # partial
    ("رنا محسن", "rana@example.com", 0, 120),
    ("إسلام عادل", "islam@example.com", 0, 120),
    ("منة", "menna@example.com", 0, 120),
    ("بلال عصام", "bilal@example.com", 10, 120),
    ("شروق ناصر", "shorouk@example.com", 0, 120),
    ("زياد وائل", "ziad@example.com", 40, 120),                        # very late
    # آية & حسام never joined
]


class FakeZoomAdapter(MeetingProvider):
    report_ready = True
    instances: dict[str, list[MeetingInstance]] = {}
    participants: dict[str, list[RawParticipant]] = {}

    def __init__(self, planned_start: datetime | None = None):
        self.planned_start = planned_start

    def list_instances(self, meeting_id: str) -> list[MeetingInstance]:
        if meeting_id in self.instances:
            return self.instances[meeting_id]
        start = self.planned_start or datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        return [MeetingInstance(uuid=f"/fake//{meeting_id}==", start_time=start)]

    def find_instance(self, meeting_id: str, target_date: datetime) -> MeetingInstance | None:
        insts = self.list_instances(meeting_id)
        return insts[0] if insts else None

    def fetch_participants(self, meeting_uuid: str) -> list[RawParticipant]:
        from app.core.errors import ReportNotReady

        if not FakeZoomAdapter.report_ready:
            raise ReportNotReady(retry_after=60)
        if meeting_uuid in self.participants:
            return self.participants[meeting_uuid]
        start = self.planned_start or datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        return [RawParticipant(name=n, email=e, user_id=None,
                               join_time=start + timedelta(minutes=j),
                               leave_time=start + timedelta(minutes=lv))
                for n, e, j, lv in FAKE_ZOOM_ROWS]


class FakeSheetsAdapter(SheetProvider):
    """A dict-backed spreadsheet: {sheet_id: {tab: [[row1], [row2], ...]}}."""
    store: dict[str, dict[str, list[list[str]]]] = {}
    writes: list[dict] = []

    @classmethod
    def seed(cls, sheet_id: str, tab: str, headers: list[str], rows: list[list[str]]) -> None:
        cls.store.setdefault(sheet_id, {})[tab] = [list(headers)] + [list(r) for r in rows]

    def _tab(self, sheet_id: str, tab: str) -> list[list[str]]:
        t = self.store.get(sheet_id, {}).get(tab)
        if t is None:
            # demo mode: materialise a sheet from the DB roster so any process can write it
            from app.db import SessionLocal
            from app.models.program import Program
            from app.models.trainee import Trainee

            db = SessionLocal()
            try:
                prog = db.query(Program).filter_by(attendance_sheet_id=sheet_id).first()
                if not prog:
                    raise SheetError(f"الشيت {sheet_id}/{tab} مش موجود (fake)")
                rows = [[t.name_ar, t.email or ""] for t in
                        db.query(Trainee).filter_by(program_id=prog.id).all()]
            finally:
                db.close()
            self.seed(sheet_id, tab, ["Name", "Email"], rows)
            t = self.store[sheet_id][tab]
        return t

    def header_map(self, sheet_id: str, tab: str) -> dict[str, int]:
        rows = self._tab(sheet_id, tab)
        if not rows or not rows[0]:
            raise SheetError(f"صف العناوين فاضي في {tab}")
        return {h.strip(): i for i, h in enumerate(rows[0]) if h and h.strip()}

    def find_row_by_key(self, sheet_id: str, tab: str, key_col: str, key: str) -> int | None:
        hm = self.header_map(sheet_id, tab)
        if key_col not in hm:
            raise SheetError(f"عمود '{key_col}' مش موجود في {tab}")
        idx = hm[key_col]
        for i, row in enumerate(self._tab(sheet_id, tab)[1:], start=2):
            if idx < len(row) and row[idx].strip().lower() == key.strip().lower():
                return i
        return None

    def ensure_column(self, sheet_id: str, tab: str, col_name: str) -> int:
        hm = self.header_map(sheet_id, tab)
        if col_name in hm:
            return hm[col_name]
        rows = self._tab(sheet_id, tab)
        rows[0].append(col_name)
        return len(rows[0]) - 1

    def snapshot(self, sheet_id: str, tab: str, rows: list[int], cols: list[str]) -> dict:
        hm = self.header_map(sheet_id, tab)
        data = self._tab(sheet_id, tab)
        out = {}
        for r in rows:
            for c in cols:
                if c in hm:
                    row = data[r - 1] if r - 1 < len(data) else []
                    out[f"{c}!{r}"] = row[hm[c]] if hm[c] < len(row) else ""
        return out

    def batch_write(self, sheet_id: str, tab: str, updates: list[CellUpdate]) -> int:
        hm = self.header_map(sheet_id, tab)
        data = self._tab(sheet_id, tab)
        n = 0
        for u in updates:
            if u.col_name not in hm:
                raise SheetError(f"عمود '{u.col_name}' مش موجود في {tab}")
            while len(data) < u.row:
                data.append([])
            row = data[u.row - 1]
            while len(row) <= hm[u.col_name]:
                row.append("")
            row[hm[u.col_name]] = u.value
            n += 1
        FakeSheetsAdapter.writes.append({"sheet": sheet_id, "tab": tab, "cells": n})
        return n


class FakeGmailAdapter(MailProvider):
    sent: list[dict] = []
    drafts: list[dict] = []
    replied: set[str] = set()

    def __init__(self, sender: str | None = None):
        self.sender = sender or "hatm@example.com"

    def create_draft(self, to: str, subject: str, body: str) -> str:
        pid = f"draft-{uuid.uuid4().hex[:10]}"
        FakeGmailAdapter.drafts.append({"id": pid, "to": to, "subject": subject, "body": body})
        return pid

    def send(self, to: str, subject: str, body: str) -> str:
        pid = f"msg-{uuid.uuid4().hex[:10]}"
        FakeGmailAdapter.sent.append({"id": pid, "to": to, "subject": subject, "body": body})
        return pid

    def has_reply(self, provider_id: str) -> bool:
        return provider_id in FakeGmailAdapter.replied

    @classmethod
    def reset(cls) -> None:
        cls.sent.clear()
        cls.drafts.clear()
        cls.replied.clear()
