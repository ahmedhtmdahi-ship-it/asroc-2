"""Feedback reminder loop: feedback sent → no reply after N hours → ONE reminder (approved) → stop on reply."""
from datetime import timedelta

from app.adapters.factory import mail_provider
from app.config import settings
from app.core.logging import record_activity
from app.core.timeutil import fmt_date_ar, utcnow
from app.db import SessionLocal
from app.domain.templates import render
from app.models.message import OutboundMessage
from app.models.project import Project
from app.models.session import Session as Sess
from app.models.trainee import Trainee
from app.orchestration.approval import ApprovalGate
from app.orchestration.messaging import compose, preview_of, template_for


def sync_replies(limit: int = 200) -> int:
    """Ask the mail provider whether sent feedback messages got a reply."""
    db = SessionLocal()
    n = 0
    try:
        rows = db.query(OutboundMessage).filter(
            OutboundMessage.status == "sent", OutboundMessage.replied_at.is_(None),
            OutboundMessage.msg_type.in_(["feedback", "reminder"]),
            OutboundMessage.provider_id.isnot(None)).limit(limit).all()
        if not rows:
            return 0
        mail = mail_provider()
        for m in rows:
            try:
                if mail.has_reply(m.provider_id):
                    m.replied_at = utcnow()
                    n += 1
                    record_activity("reply_received", target_type="trainee", target_id=m.trainee_id,
                                    after={"message_id": m.id})
            except Exception:  # noqa: BLE001 — a provider hiccup must not stop the sweep
                continue
        db.commit()
        return n
    finally:
        db.close()


def pending_feedback(db, project_id: int | None = None) -> list[OutboundMessage]:
    cutoff = utcnow() - timedelta(hours=settings.feedback_reminder_after_hours)
    q = db.query(OutboundMessage).filter(
        OutboundMessage.msg_type == "feedback", OutboundMessage.status == "sent",
        OutboundMessage.replied_at.is_(None), OutboundMessage.sent_at <= cutoff)
    rows = q.all()
    out = []
    for m in rows:
        if project_id is not None:
            t = db.get(Trainee, m.trainee_id)
            if not t or t.project_id != project_id:
                continue
        already = db.query(OutboundMessage).filter_by(
            trainee_id=m.trainee_id, session_id=m.session_id, msg_type="reminder").first()
        if already and already.status not in ("failed",):
            continue
        out.append(m)
    return out


def create_reminder_approval(project_id: int | None = None) -> dict:
    """Compose reminders for unanswered feedback and put them behind ONE approval."""
    db = SessionLocal()
    try:
        targets = pending_feedback(db, project_id)
        if not targets:
            return {"created": 0}
        msgs = []
        for fb in targets:
            t = db.get(Trainee, fb.trainee_id)
            sess = db.get(Sess, fb.session_id) if fb.session_id else None
            prog = db.get(Project, t.project_id)
            tpl = template_for(db, "reminder")
            r = render(tpl["body"], {
                "name": (t.name_ar or "").split(" ")[0],
                "subject_ref": f"استمارة تقييم {sess.title if sess else prog.name}",
                "details": (f"اتبعتلك الاستمارة يوم {fmt_date_ar(fb.sent_at)}"
                            f"{(' — ' + prog.feedback_form_url) if prog.feedback_form_url else ''}"),
                "program_name": prog.name}, tpl["subject"])
            m = compose(db, trainee=t, msg_type="reminder", session=sess, project=prog)
            m.rendered_subject, m.rendered_body = r.subject, r.body
            msgs.append(m)
        db.flush()
        preview_msgs = preview_of(db, msgs)
        a = ApprovalGate().create(
            type="send_messages",
            payload={"stage": "reminders", "project_id": project_id,
                     "message_ids": [m.id for m in msgs],
                     "messages": [{"message_id": p["message_id"], "excluded": False}
                                  for p in preview_msgs]},
            preview={"summary": f"{len(msgs)} تذكير Feedback لمتدربين مردوش",
                     "recipient_count": len(msgs), "channel": "email",
                     "send_enabled": settings.ff_send_email, "messages": preview_msgs},
        )
        for m in msgs:
            m.approval_id, m.status = a.id, "pending_approval"
        db.commit()
        return {"created": len(msgs), "approval_id": a.id}
    finally:
        db.close()
