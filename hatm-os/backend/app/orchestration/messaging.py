"""Compose and send OutboundMessages. `execute_send` is the ONLY path that sends."""
import logging

from app.adapters.factory import mail_provider
from app.config import settings
from app.core.idempotency import message_key
from app.core.logging import record_activity
from app.core.timeutil import fmt_date_ar, utcnow
from app.db import SessionLocal
from app.domain.rules import min_required_pct
from app.domain.templates import TEMPLATES, render
from app.models.message import MessageTemplate, OutboundMessage
from app.models.program import Program
from app.models.session import Session as Sess
from app.models.trainee import Trainee
from app.orchestration.antispam import AntiSpamGate
from app.orchestration.approval import ApprovalGate

log = logging.getLogger("hatm.messaging")


def template_for(db, msg_type: str, lang: str = "ar") -> dict:
    row = db.query(MessageTemplate).filter_by(type=msg_type, lang=lang, active=True).first()
    if row:
        return {"subject": row.subject, "body": row.body, "id": row.id}
    if msg_type not in TEMPLATES:
        raise KeyError(msg_type)
    return {**TEMPLATES[msg_type], "id": None}


def first_name(t: Trainee) -> str:
    return (t.name_ar or t.name_en or "").split(" ")[0]


def build_variables(db, t: Trainee, sess: Sess | None, prog: Program, rec=None) -> dict:
    v = {"name": first_name(t), "program_name": prog.name,
         "form_url": prog.feedback_form_url or "",
         "min_required": min_required_pct(prog.attendance_rules)}
    if sess:
        v.update({"session_title": sess.title, "session_date": fmt_date_ar(sess.planned_start),
                  "total_minutes": int(sess.planned_minutes)})
        nxt = db.query(Sess).filter(Sess.program_id == prog.id,
                                    Sess.planned_start > sess.planned_start,
                                    Sess.status != "closed").order_by(Sess.planned_start).first()
        if nxt:
            v["next_session"] = fmt_date_ar(nxt.planned_start)
    if rec is not None:
        v.update({"percentage": int(round(rec.percentage)), "minutes": int(round(rec.total_minutes))})
    return v


def compose(db, *, trainee: Trainee, msg_type: str, session: Sess | None, program: Program,
            rec=None, variant: str | None = None) -> OutboundMessage:
    """Render + persist a draft. Idempotent per (trainee, type, session, channel)."""
    key = message_key(trainee.id, msg_type, session.id if session else None, "email", variant)
    existing = db.query(OutboundMessage).filter_by(idempotency_key=key).first()
    if existing:
        return existing
    tpl = template_for(db, msg_type)
    r = render(tpl["body"], build_variables(db, trainee, session, program, rec), tpl["subject"])
    m = OutboundMessage(
        trainee_id=trainee.id, session_id=session.id if session else None,
        template_id=tpl["id"], channel="email", msg_type=msg_type, to_address=trainee.email,
        rendered_subject=r.subject, rendered_body=r.body, status="draft", idempotency_key=key,
    )
    db.add(m)
    db.flush()
    return m


def preview_of(db, messages: list[OutboundMessage]) -> list[dict]:
    out = []
    for m in messages:
        t = db.get(Trainee, m.trainee_id)
        out.append({"message_id": m.id, "trainee_id": m.trainee_id,
                    "name": t.name_ar if t else "", "email": m.to_address,
                    "type": m.msg_type, "subject": m.rendered_subject,
                    "body": m.rendered_body, "excluded": False})
    return out


def execute_send(approval_id: int) -> dict:
    """
    Send every message under an approved `send_messages` approval.
    Guards, in order: approval status → per-message idempotency → anti-spam → feature flag.
    """
    gate = ApprovalGate()
    approval = gate.require_approved(approval_id)
    payload = approval.payload
    edited = {m["message_id"]: m for m in payload.get("messages", []) if "message_id" in m}

    db = SessionLocal()
    sent = skipped = failed = drafted = excluded = 0
    provider = None
    try:
        rows = db.query(OutboundMessage).filter_by(approval_id=approval_id).all()
        for m in rows:
            if m.status in ("sent", "excluded"):
                continue                      # replay safety
            e = edited.get(m.id)
            if e and e.get("excluded"):
                m.status = "excluded"
                excluded += 1
                continue
            if e:
                m.rendered_subject = e.get("subject", m.rendered_subject)
                m.rendered_body = e.get("body", m.rendered_body)
            if not m.to_address:
                m.status, m.error = "skipped", "مفيش إيميل للمتدرب"
                skipped += 1
                continue
            ok, why = AntiSpamGate.check(m.trainee_id, db)
            if not ok:
                m.status, m.error = "skipped", why
                skipped += 1
                continue
            try:
                provider = provider or mail_provider()
                if settings.ff_send_email:
                    m.provider_id = provider.send(m.to_address, m.rendered_subject or "", m.rendered_body)
                    m.status, m.sent_at, m.error = "sent", utcnow(), None
                    sent += 1
                else:
                    m.provider_id = provider.create_draft(m.to_address, m.rendered_subject or "",
                                                          m.rendered_body)
                    m.status, m.error = "drafted", "FF_SEND_EMAIL=false — اتحفظت كـ draft"
                    drafted += 1
            except Exception as ex:  # noqa: BLE001 — one bad address must not stop the batch
                m.status, m.error = "failed", str(ex)[:500]
                failed += 1
            db.commit()
            record_activity("message_sent" if m.status == "sent" else f"message_{m.status}",
                            target_type="trainee", target_id=m.trainee_id,
                            result="failure" if m.status == "failed" else "success",
                            error=m.error if m.status == "failed" else None,
                            after={"message_id": m.id, "type": m.msg_type, "to": m.to_address,
                                   "subject": m.rendered_subject, "provider_id": m.provider_id})
        db.commit()
    finally:
        db.close()

    result = {"sent": sent, "drafted": drafted, "skipped": skipped, "failed": failed,
              "excluded": excluded}
    gate.mark_executed(approval_id, result)
    return result
