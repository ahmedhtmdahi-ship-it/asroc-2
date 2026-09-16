from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.api.deps import current_user
from app.core.errors import NotFound
from app.core.timeutil import fmt_date_ar, fmt_time_local
from app.db import get_db
from app.models.activity import ActivityLog
from app.models.attendance import AttendanceRecord
from app.models.message import OutboundMessage
from app.models.session import Session as Sess
from app.models.trainee import Trainee
from app.services import dashboard as svc

router = APIRouter(dependencies=[Depends(current_user)])


@router.get("/dashboard/priorities")
def priorities(top: int = 3):
    return svc.priorities(top)


@router.get("/dashboard/summary")
def summary():
    return svc.summary()


@router.get("/dashboard/charts")
def charts(program_id: int | None = None):
    return svc.charts(program_id)


@router.get("/dashboard/brief")
def brief(kind: str = "morning"):
    return svc.build_brief(kind)


@router.get("/trainees/{trainee_id}/timeline")
def timeline(trainee_id: int, db: DBSession = Depends(get_db)):
    t = db.get(Trainee, trainee_id)
    if not t:
        raise NotFound("المتدرب مش موجود")
    items = []
    for r in db.query(AttendanceRecord).filter_by(trainee_id=trainee_id).all():
        s = db.get(Sess, r.session_id)
        items.append({"at": s.planned_start.isoformat(), "date": fmt_date_ar(s.planned_start),
                      "kind": "attendance", "status": r.status,
                      "text": f"{s.title} — {round(r.total_minutes)} دقيقة ({int(r.percentage)}%)"})
    for m in db.query(OutboundMessage).filter_by(trainee_id=trainee_id).all():
        at = m.sent_at or m.created_at
        items.append({"at": at.isoformat() if at else None, "date": fmt_date_ar(at) if at else "",
                      "kind": "message", "status": m.status,
                      "text": f"{m.msg_type}: {m.rendered_subject or ''} ({m.status})"})
        if m.replied_at:
            items.append({"at": m.replied_at.isoformat(), "date": fmt_date_ar(m.replied_at),
                          "kind": "reply", "status": "replied", "text": "رد على الرسالة"})
    items.sort(key=lambda x: x["at"] or "")
    return {"trainee": {"id": t.id, "name_ar": t.name_ar, "email": t.email,
                        "zoom_aliases": t.zoom_aliases}, "timeline": items}


@router.get("/activity")
def activity(limit: int = 50, workflow_run_id: str | None = None, session_id: int | None = None,
             db: DBSession = Depends(get_db)):
    q = db.query(ActivityLog)
    if workflow_run_id:
        q = q.filter(ActivityLog.workflow_run_id == workflow_run_id)
    if session_id:
        q = q.filter(ActivityLog.target_type == "session", ActivityLog.target_id == str(session_id))
    rows = q.order_by(ActivityLog.timestamp.desc(), ActivityLog.id.desc()).limit(min(limit, 200)).all()
    return {"activity": [{
        "id": a.id, "at": a.timestamp.isoformat() if a.timestamp else None,
        "time": fmt_time_local(a.timestamp), "actor": f"{a.actor_type}:{a.actor_id or ''}",
        "action": a.action, "target": f"{a.target_type}:{a.target_id}" if a.target_type else None,
        "result": a.result, "error": a.error, "duration_ms": a.duration_ms,
        "before": a.before, "after": a.after, "workflow_run_id": a.workflow_run_id,
    } for a in rows]}
