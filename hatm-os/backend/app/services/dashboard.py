"""Aggregations for Mission Control: priorities (explainable), summary, charts, brief."""
from datetime import timedelta

from sqlalchemy import func

from app.core.timeutil import fmt_day_date_ar, fmt_time_local, to_local, utcnow
from app.db import SessionLocal
from app.domain.priorities import PriorityItem, rank
from app.models.approval import Approval
from app.models.attendance import AttendanceRecord
from app.models.message import OutboundMessage
from app.models.program import Program
from app.models.session import Session as Sess
from app.models.trainee import Trainee
from app.models.workflow import WorkflowRun


def _hours_since(dt) -> float:
    return max(0.0, (utcnow() - dt).total_seconds() / 3600) if dt else 0.0


def collect_priority_items(db) -> list[PriorityItem]:
    items: list[PriorityItem] = []
    now = utcnow()

    for a in db.query(Approval).filter(Approval.status == "pending",
                                       Approval.expires_at > now).all():
        n = a.preview.get("recipient_count") or len(a.preview.get("rows", [])) or 1
        items.append(PriorityItem(
            id=f"approval:{a.id}", title=a.preview.get("summary", a.type), kind="decision",
            affected=n, hours_to_deadline=(a.expires_at - now).total_seconds() / 3600,
            blocking=bool(a.workflow_run_id), age_hours=_hours_since(a.created_at),
            action_label="راجع ووافق", action_url=f"/approvals/{a.id}",
            extra={"approval_id": a.id, "type": a.type}))

    reviews = db.query(AttendanceRecord.session_id, func.count(AttendanceRecord.id)) \
        .filter(AttendanceRecord.needs_review.is_(True)) \
        .group_by(AttendanceRecord.session_id).all()
    for sid, n in reviews:
        s = db.get(Sess, sid)
        items.append(PriorityItem(
            id=f"review:{sid}", title=f"{n} أسماء محتاجة تأكيدك — {s.title if s else sid}",
            kind="review", affected=n, blocking=True, age_hours=_hours_since(s.planned_end if s else None),
            action_label="راجع", action_url=f"/review/{sid}", extra={"session_id": sid}))

    for s in db.query(Sess).filter(Sess.status == "scheduled", Sess.planned_end < now).all():
        n = db.query(func.count(Trainee.id)).filter_by(program_id=s.program_id, status="active").scalar()
        items.append(PriorityItem(
            id=f"close:{s.id}", title=f"إغلاق جلسة {s.title} — {fmt_day_date_ar(s.planned_start)}",
            kind="task", affected=n or 0, age_hours=_hours_since(s.planned_end),
            action_label="ابدأ", action_url=f"/sessions/{s.id}",
            extra={"session_id": s.id, "command": f"اقفل سيشن {s.title}"}))

    for r in db.query(WorkflowRun).filter(WorkflowRun.status == "failed").limit(5).all():
        items.append(PriorityItem(
            id=f"failed:{r.id}", title=f"workflow فشل: {r.error or r.definition}"[:120],
            kind="decision", blocking=True, age_hours=_hours_since(r.updated_at),
            action_label="شوف", action_url=f"/sessions/{r.session_id}" if r.session_id else "/activity",
            extra={"run_id": r.id}))
    return items


def priorities(top: int = 3) -> dict:
    db = SessionLocal()
    try:
        items = collect_priority_items(db)
        ranked = rank(items, top=0)
        return {"top": ranked[:top], "all": ranked, "generated_at": utcnow().isoformat()}
    finally:
        db.close()


def summary() -> dict:
    db = SessionLocal()
    try:
        now = utcnow()
        day_start = to_local(now).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        today = db.query(Sess).filter(Sess.planned_start >= day_start.astimezone().replace(tzinfo=None) - timedelta(hours=3),
                                      Sess.planned_start < day_end.astimezone().replace(tzinfo=None) + timedelta(hours=3)).all()
        today = [s for s in today if day_start <= to_local(s.planned_start) < day_end]

        no_feedback = db.query(func.count(OutboundMessage.id)).filter(
            OutboundMessage.msg_type == "feedback", OutboundMessage.status == "sent",
            OutboundMessage.replied_at.is_(None)).scalar() or 0
        low = db.query(func.count(func.distinct(AttendanceRecord.trainee_id))).filter(
            AttendanceRecord.percentage < 70, AttendanceRecord.trainee_id.isnot(None),
            AttendanceRecord.status.in_(["partial", "absent"])).scalar() or 0
        pending_reviews = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.needs_review.is_(True)).scalar() or 0
        pending_approvals = db.query(func.count(Approval.id)).filter(
            Approval.status == "pending", Approval.expires_at > now).scalar() or 0
        unclosed = db.query(func.count(Sess.id)).filter(
            Sess.status.notin_(["closed"]), Sess.planned_end < now).scalar() or 0

        return {
            "greeting_date": fmt_day_date_ar(now),
            "today_sessions": [{"id": s.id, "title": s.title, "status": s.status,
                                "time": fmt_time_local(s.planned_start)} for s in today],
            "followups": {"no_feedback": no_feedback, "low_attendance": low,
                          "pending_reviews": pending_reviews,
                          "pending_approvals": pending_approvals, "unclosed_sessions": unclosed},
            "programs": [{"id": p.id, "name": p.name} for p in
                         db.query(Program).filter_by(status="active").all()],
        }
    finally:
        db.close()


def charts(program_id: int | None = None, limit: int = 12) -> dict:
    db = SessionLocal()
    try:
        q = db.query(Sess).filter(Sess.status == "closed")
        if program_id:
            q = q.filter(Sess.program_id == program_id)
        sessions = q.order_by(Sess.planned_start.desc()).limit(limit).all()[::-1]
        attendance, statuses = [], []
        for s in sessions:
            recs = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == s.id, AttendanceRecord.trainee_id.isnot(None),
                AttendanceRecord.excluded.is_(False)).all()
            n = len(recs) or 1
            present = sum(1 for r in recs if r.status in ("present", "late", "early_leave"))
            counts: dict[str, int] = {}
            for r in recs:
                counts[r.status] = counts.get(r.status, 0) + 1
            label = f"{s.title} {to_local(s.planned_start).strftime('%m-%d')}"
            attendance.append({"session": label, "rate": round(present / n * 100)})
            statuses.append({"session": label, **counts})
        fb_sent = db.query(func.count(OutboundMessage.id)).filter(
            OutboundMessage.msg_type == "feedback", OutboundMessage.status == "sent").scalar() or 0
        fb_replied = db.query(func.count(OutboundMessage.id)).filter(
            OutboundMessage.msg_type == "feedback", OutboundMessage.replied_at.isnot(None)).scalar() or 0
        return {"attendance": attendance, "statuses": statuses,
                "feedback": {"sent": fb_sent, "replied": fb_replied,
                             "rate": round(fb_replied / fb_sent * 100) if fb_sent else 0}}
    finally:
        db.close()


def build_brief(kind: str) -> dict:
    p = priorities(top=3)
    s = summary()
    lines = [f"{'صباح الخير' if kind == 'morning' else 'ملخص اليوم'} يا حاتم — {s['greeting_date']}"]
    if p["top"]:
        lines.append("أهم الأولويات:")
        lines += [f"{i}. {x['title']} — {x['reasoning']}" for i, x in enumerate(p["top"], 1)]
    else:
        lines.append("مفيش حاجة معلّقة ✓")
    f = s["followups"]
    lines.append(f"متابعات: {f['no_feedback']} لم يرسلوا Feedback · {f['low_attendance']} حضور منخفض · "
                 f"{f['pending_reviews']} مراجعة · {f['pending_approvals']} موافقة")
    if s["today_sessions"]:
        lines.append("النهاردة: " + " · ".join(f"{x['title']} {x['time']}" for x in s["today_sessions"]))
    return {"kind": kind, "text": "\n".join(lines), "priorities": p["top"], "summary": s}
