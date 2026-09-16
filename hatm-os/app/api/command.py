"""POST /api/command → AI /parse → validate → act (start a workflow) or ask ONE question."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.adapters import factory
from app.api.deps import current_user
from app.api.schemas import CommandIn
from app.core.logging import record_activity
from app.core.timeutil import fmt_day_date_ar, utcnow
from app.db import get_db
from app.models.project import Project
from app.models.session import Session as Sess
from app.models.workflow import WorkflowRun
from app.orchestration.followup import create_reminder_approval
from app.services import dashboard as svc
from app.tasks.attendance import start_workflow

router = APIRouter(dependencies=[Depends(current_user)])


def _context(db) -> dict:
    progs = db.query(Project).filter_by(status="active").all()
    sessions = db.query(Sess).filter(Sess.status != "closed").order_by(Sess.planned_start.desc()) \
        .limit(30).all()
    return {"active_programs": [{"id": p.id, "name": p.name} for p in progs],
            "recent_sessions": [{"id": s.id, "project_id": s.project_id,
                                 "date": s.planned_start.date().isoformat(), "title": s.title,
                                 "label": f"{s.title} — {fmt_day_date_ar(s.planned_start)}",
                                 "status": s.status} for s in sessions],
            "now": utcnow().isoformat()}


@router.post("/command")
def command(body: CommandIn, actor: str = Depends(current_user), db: DBSession = Depends(get_db)):
    ctx = _context(db)
    parsed = factory.intelligence_provider().parse(body.text, ctx)
    entities = {**(parsed.get("entities") or {}), **(body.choice or {})}
    intent = parsed.get("intent", "unknown")
    record_activity("command", target_type="command", after={"text": body.text, "intent": intent,
                                                              "entities": entities,
                                                              "confidence": parsed.get("confidence")})
    reply = {"text": body.text, "intent": intent, "entities": entities,
             "confidence": parsed.get("confidence", 0), "clarification": None, "action": None}

    # second layer: never trust ids the model returns
    valid_sessions = {s["id"] for s in ctx["recent_sessions"]}
    valid_programs = {p["id"] for p in ctx["active_programs"]}
    if entities.get("session_id") not in valid_sessions:
        entities["session_id"] = None
    if entities.get("project_id") not in valid_programs:
        entities["project_id"] = None

    if intent == "close_session":
        sid = entities.get("session_id")
        if not sid:
            cands = [s for s in ctx["recent_sessions"]
                     if not entities.get("project_id") or s["project_id"] == entities["project_id"]]
            if len(cands) == 1:
                sid = cands[0]["id"]
            else:
                reply["clarification"] = parsed.get("clarification_needed") or {
                    "question": "أنهي جلسة تقفل؟" if cands else "مفيش جلسات مفتوحة للبرنامج ده",
                    "options": [{"session_id": s["id"], "label": s["label"]} for s in cands[:6]]}
                return reply
        active = db.query(WorkflowRun).filter(
            WorkflowRun.session_id == sid,
            WorkflowRun.status.in_(["running", "paused", "awaiting_approval"])).first()
        if active:
            reply["action"] = {"type": "workflow", "run_id": active.id, "session_id": sid,
                               "message": "فيه إغلاق شغال بالفعل للجلسة دي — هوريهولك"}
            return reply
        res = start_workflow.delay("close_session", {"session_id": sid}, actor)
        run_id = res.get()["run_id"] if res.ready() else None
        s = db.get(Sess, sid)
        reply["action"] = {"type": "workflow", "run_id": run_id, "session_id": sid,
                           "message": f"فهمت: إغلاق جلسة {s.title} — {fmt_day_date_ar(s.planned_start)}"}
        return reply

    if intent == "send_reminders":
        out = create_reminder_approval(entities.get("project_id"))
        reply["action"] = {"type": "approval" if out.get("approval_id") else "info",
                           "approval_id": out.get("approval_id"),
                           "message": (f"جهّزت {out['created']} تذكير — مستنيين موافقتك"
                                       if out["created"] else "مفيش حد متأخر في الرد على الـ Feedback ✓")}
        return reply

    if intent == "daily_brief":
        reply["action"] = {"type": "brief", "brief": svc.build_brief("morning")}
        return reply

    if intent == "search":
        q = (entities.get("query") or body.text).strip()
        from app.models.trainee import Trainee
        hits = db.query(Trainee).filter(Trainee.name_ar.contains(q) | Trainee.name_en.contains(q)
                                        | Trainee.email.contains(q)).limit(10).all()
        reply["action"] = {"type": "search", "results": [
            {"trainee_id": t.id, "name_ar": t.name_ar, "email": t.email} for t in hits],
            "message": f"{len(hits)} نتيجة"}
        return reply

    reply["clarification"] = parsed.get("clarification_needed") or {
        "question": "مش فاهم الأمر ده لسه — جرّب: «اقفل سيشن React» أو «ابعت التذكيرات» أو «ملخص النهاردة»",
        "options": []}
    return reply
