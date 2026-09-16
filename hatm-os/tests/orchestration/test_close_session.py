"""End-to-end close_session on fake adapters + stub AI, driven the way the API drives it."""
from app.adapters.fake import FakeGmailAdapter, FakeSheetsAdapter, FakeZoomAdapter
from app.config import settings
from app.core.logging import set_actor
from app.models.activity import ActivityLog
from app.models.approval import Approval
from app.models.attendance import AttendanceRecord
from app.models.message import OutboundMessage
from app.models.session import Session as Sess
from app.models.trainee import Trainee
from app.models.workflow import WorkflowRun
from app.orchestration import flows  # noqa: F401
from app.orchestration.approval import ApprovalGate
from app.orchestration.engine import engine


def _confirm_all_reviews(db, session_id):
    """Emulate Review: 'احمد م.' → أحمد محمود, 'Ahmed Mostafa' → أحمد مصطفى, 'محمد علي' → محمد علي."""
    mapping = {"احمد م.": "أحمد محمود حسن", "Ahmed Mostafa": "أحمد مصطفى", "محمد علي": "محمد علي"}
    for r in db.query(AttendanceRecord).filter_by(session_id=session_id, needs_review=True).all():
        t = db.query(Trainee).filter_by(name_ar=mapping[r.zoom_name]).one()
        r.trainee_id, r.needs_review, r.match_method, r.match_confidence = t.id, False, "manual", 1.0
        t.add_alias(r.zoom_name)
    db.commit()


def _approve_and_resume(db, run_id, stage):
    db.expire_all()
    a = db.query(Approval).filter_by(workflow_run_id=run_id, status="pending").one()
    assert a.payload["stage"] == stage
    ApprovalGate().decide(a.id, True, "hatem")
    return engine.resume(run_id, {f"{stage}_approved": True, f"{stage}_approval_id": a.id})


def test_full_flow(db, seeded):
    set_actor("human", "hatem")
    sid = seeded["session"].id
    run = engine.start("close_session", {"session_id": sid})

    # 1) pauses for review — 3 ambiguous Zoom names
    assert run.status == "paused" and run.pause_reason == "needs_review"
    db.expire_all()
    assert db.get(Sess, sid).status == "needs_review"
    reviews = db.query(AttendanceRecord).filter_by(session_id=sid, needs_review=True).all()
    assert {r.zoom_name for r in reviews} == {"احمد م.", "Ahmed Mostafa", "محمد علي"}
    # durations already computed & merged (Sara: phone+laptop overlap → 95 not 135)
    sara = db.query(AttendanceRecord).filter_by(session_id=sid, zoom_email="sara.a@example.com").one()
    assert sara.total_minutes == 95 and sara.disconnect_count == 0
    hadeer = db.query(AttendanceRecord).filter_by(session_id=sid, zoom_email="hadeer@example.com").one()
    assert hadeer.disconnect_count == 2

    _confirm_all_reviews(db, sid)
    run = engine.resume(run.id)
    db.expire_all()

    # 2) evaluated, paused for sheet approval — nothing written yet
    assert run.status == "awaiting_approval" and run.resume_token == "sheet"
    assert FakeSheetsAdapter.writes == []
    recs = {r.trainee_id: r for r in db.query(AttendanceRecord).filter_by(session_id=sid).all()}
    by_name = {t.name_ar: recs[t.id] for t in seeded["trainees"]}
    assert by_name["آية مجدي"].status == "absent" and by_name["حسام الدين"].status == "absent"
    assert by_name["يوسف إبراهيم"].status == "absent"          # 40/120 = 33%
    assert by_name["عبدالرحمن طارق"].status == "partial"        # 65/120 = 54%
    assert by_name["نورهان سيد"].status == "late"               # joined +22 min
    assert by_name["زياد وائل"].status == "partial"             # 80/120 = 66.7%, also late flag
    assert by_name["سارة عبدالله"].status == "partial"          # 95/120 = 79.2% (overlap merged)
    assert by_name["هدير رمضان"].status == "present"           # 113/120 across 3 rows
    assert len(recs) == 24

    run = _approve_and_resume(db, run.id, "sheet")

    # 3) sheet written by column name, then paused for message approval
    assert FakeSheetsAdapter.writes and FakeSheetsAdapter.writes[0]["cells"] == 24
    hdr = FakeSheetsAdapter.store["sheet-1"]["Attendance"][0]
    assert any(h.startswith("React 2026-08-17") for h in hdr)
    assert run.status == "awaiting_approval" and run.resume_token == "messages"
    msgs = db.query(OutboundMessage).filter_by(session_id=sid).all()
    assert {m.msg_type for m in msgs} == {"absence", "partial"}
    assert len(msgs) == 7          # 4 absent (incl. 2 never joined) + 3 partial
    assert all("{{" not in m.rendered_body for m in msgs)
    assert FakeGmailAdapter.sent == []

    run = _approve_and_resume(db, run.id, "messages")

    # 4) FF_SEND_EMAIL=false → drafts, never sends
    assert run.status == "completed"
    assert FakeGmailAdapter.sent == []
    assert len(FakeGmailAdapter.drafts) == 7
    db.expire_all()
    assert db.get(Sess, sid).status == "closed"
    approvals = db.query(Approval).filter_by(workflow_run_id=run.id).all()
    assert all(a.status == "executed" for a in approvals)

    # everything logged
    actions = {a.action for a in db.query(ActivityLog).all()}
    assert {"workflow_started", "zoom_report_fetched", "names_matched", "attendance_evaluated",
            "approval_created", "approval_approved", "write_attendance_sheet",
            "approval_executed", "session_closed", "workflow_completed"} <= actions


def test_replay_is_identical_and_aliases_learned(db, seeded):
    sid = seeded["session"].id
    run = engine.start("close_session", {"session_id": sid})
    _confirm_all_reviews(db, sid)
    engine.resume(run.id)
    db.expire_all()
    first = {(r.zoom_name, r.trainee_id, r.total_minutes, r.status)
             for r in db.query(AttendanceRecord).filter_by(session_id=sid).all()}
    engine.cancel(run.id)

    # replay: aliases now exist → no review pause; same numbers
    run2 = engine.start("close_session", {"session_id": sid})
    assert run2.status == "awaiting_approval" and run2.resume_token == "sheet"
    db.expire_all()
    second = {(r.zoom_name, r.trainee_id, r.total_minutes, r.status)
              for r in db.query(AttendanceRecord).filter_by(session_id=sid).all()}
    assert first == second


def test_zoom_report_not_ready_pauses_not_fails(db, seeded):
    FakeZoomAdapter.report_ready = False
    run = engine.start("close_session", {"session_id": seeded["session"].id})
    assert run.status == "paused" and run.pause_reason == "zoom_report_not_ready"
    assert run.context.get("_retry_after") == 60
    FakeZoomAdapter.report_ready = True
    run = engine.resume(run.id)
    assert run.pause_reason == "needs_review"


def test_send_with_flag_on_and_antispam(db, seeded, monkeypatch):
    monkeypatch.setattr(settings, "ff_send_email", True)
    sid = seeded["session"].id
    run = engine.start("close_session", {"session_id": sid})
    _confirm_all_reviews(db, sid)
    engine.resume(run.id)
    _approve_and_resume(db, run.id, "sheet")
    run = _approve_and_resume(db, run.id, "messages")
    assert run.status == "completed"
    assert len(FakeGmailAdapter.sent) == 7
    assert run.context["send_result"]["sent"] == 7

    # second batch to the same people within 24h is blocked by the anti-spam gate
    from app.orchestration.antispam import AntiSpamGate
    absent = db.query(OutboundMessage).filter_by(session_id=sid).first()
    ok, why = AntiSpamGate.check(absent.trainee_id)
    assert not ok and "24" in why

    # approving the executed approval again can't send again
    a = db.query(Approval).filter_by(workflow_run_id=run.id, type="send_messages").one()
    import pytest

    from app.core.errors import ApprovalRequired
    from app.orchestration.messaging import execute_send
    with pytest.raises(ApprovalRequired):
        execute_send(a.id)
    assert len(FakeGmailAdapter.sent) == 7


def test_excluded_recipient_is_not_sent(db, seeded, monkeypatch):
    monkeypatch.setattr(settings, "ff_send_email", True)
    sid = seeded["session"].id
    run = engine.start("close_session", {"session_id": sid})
    _confirm_all_reviews(db, sid)
    engine.resume(run.id)
    _approve_and_resume(db, run.id, "sheet")
    a = db.query(Approval).filter_by(workflow_run_id=run.id, status="pending").one()
    msgs = a.payload["messages"]
    msgs[0]["excluded"] = True
    ApprovalGate().patch_payload(a.id, {"messages": msgs}, "hatem")
    run = _approve_and_resume(db, run.id, "messages")
    assert run.context["send_result"] == {"sent": 6, "drafted": 0, "skipped": 0, "failed": 0,
                                          "excluded": 1}
    run_ids = {r.id for r in db.query(WorkflowRun).all()}
    assert run.id in run_ids
