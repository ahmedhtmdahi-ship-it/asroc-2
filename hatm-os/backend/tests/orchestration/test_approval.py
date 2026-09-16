from datetime import timedelta

import pytest
from freezegun import freeze_time

from app.core.errors import ApprovalExpired, ApprovalRequired
from app.orchestration.approval import ApprovalGate


def test_idempotent_create(db):
    g = ApprovalGate()
    a = g.create("update_sheet", {"session_id": 1, "stage": "sheet"}, {"summary": "x"})
    b = g.create("update_sheet", {"session_id": 1, "stage": "sheet"}, {"summary": "y"})
    assert a.id == b.id


def test_double_decide_is_noop(db):
    g = ApprovalGate()
    a = g.create("send_messages", {"session_id": 2, "stage": "messages"}, {"summary": "x"})
    first = g.decide(a.id, True, "hatem")
    second = g.decide(a.id, False, "hatem", reason="changed my mind")
    assert first.status == second.status == "approved"


def test_execution_requires_approved(db):
    g = ApprovalGate()
    a = g.create("send_messages", {"session_id": 3, "stage": "messages"}, {"summary": "x"})
    with pytest.raises(ApprovalRequired):
        g.require_approved(a.id)
    g.decide(a.id, True, "hatem")
    g.require_approved(a.id)
    g.mark_executed(a.id, {"sent": 1})
    with pytest.raises(ApprovalRequired):          # executed twice = never
        g.require_approved(a.id)


def test_expiry(db):
    g = ApprovalGate()
    with freeze_time("2026-08-17 10:00:00"):
        a = g.create("update_sheet", {"session_id": 4, "stage": "sheet"}, {"summary": "x"})
    with freeze_time("2026-08-17 10:00:00") as ft:
        ft.tick(timedelta(hours=73))
        with pytest.raises(ApprovalExpired):
            g.decide(a.id, True, "hatem")
        assert g.expire_stale() == 0            # already flipped to expired


def test_patch_payload_keeps_pending_and_rekeys(db):
    g = ApprovalGate()
    a = g.create("send_messages", {"stage": "messages", "messages": [{"message_id": 1, "excluded": False}]},
                 {"summary": "x", "messages": [{"message_id": 1, "excluded": False}], "recipient_count": 1})
    old_key = a.idempotency_key
    b = g.patch_payload(a.id, {"messages": [{"message_id": 1, "excluded": True}]}, "hatem")
    assert b.status == "pending" and b.idempotency_key != old_key
    assert b.preview["recipient_count"] == 0
