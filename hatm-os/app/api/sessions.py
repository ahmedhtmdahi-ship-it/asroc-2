from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.api.deps import current_user
from app.core.errors import Conflict, NotFound
from app.core.timeutil import fmt_date_ar, fmt_time_local
from app.db import get_db
from app.models.attendance import AttendanceRecord
from app.models.session import Session as Sess
from app.models.trainee import Trainee
from app.models.workflow import WorkflowRun
from app.orchestration import flows  # noqa: F401
from app.orchestration.engine import REGISTRY
from app.tasks.attendance import start_workflow

router = APIRouter(dependencies=[Depends(current_user)])


def _session(s: Sess) -> dict:
    return {"id": s.id, "title": s.title, "status": s.status, "project_id": s.project_id,
            "project": s.project.name if s.project else None,
            "date": s.planned_start.isoformat(), "date_ar": fmt_date_ar(s.planned_start),
            "planned_start": fmt_time_local(s.planned_start),
            "planned_end": fmt_time_local(s.planned_end),
            "planned_minutes": s.planned_minutes, "zoom_meeting_id": s.zoom_meeting_id,
            "closed_at": s.closed_at.isoformat() if s.closed_at else None}


def _run(r: WorkflowRun | None) -> dict | None:
    if not r:
        return None
    defn = REGISTRY.get(r.definition)
    return {"run_id": r.id, "definition": r.definition, "status": r.status,
            "current_step": r.current_step, "pause_reason": r.pause_reason,
            "resume_token": r.resume_token, "completed_steps": r.completed_steps,
            "steps": defn.step_labels() if defn else [], "error": r.error,
            "events": (r.events or [])[-40:], "session_id": r.session_id,
            "context": {k: v for k, v in (r.context or {}).items()
                        if k in ("counts", "cells_written", "send_result", "match_stats",
                                 "sheet_approval_id", "messages_approval_id", "_retry_after")},
            "updated_at": r.updated_at.isoformat() if r.updated_at else None}


@router.get("")
def list_sessions(status: str | None = None, project_id: int | None = None,
                  db: DBSession = Depends(get_db)):
    q = db.query(Sess)
    if status:
        q = q.filter(Sess.status == status)
    if project_id:
        q = q.filter(Sess.project_id == project_id)
    return {"sessions": [_session(s) for s in q.order_by(Sess.planned_start.desc()).limit(50).all()]}


@router.get("/{session_id}")
def get_session(session_id: int, db: DBSession = Depends(get_db)):
    s = db.get(Sess, session_id)
    if not s:
        raise NotFound("الجلسة مش موجودة")
    run = db.query(WorkflowRun).filter_by(session_id=session_id) \
        .order_by(WorkflowRun.created_at.desc()).first()
    return {**_session(s), "run": _run(run)}


@router.get("/{session_id}/attendance")
def attendance(session_id: int, db: DBSession = Depends(get_db)):
    s = db.get(Sess, session_id)
    if not s:
        raise NotFound("الجلسة مش موجودة")
    recs = db.query(AttendanceRecord).filter_by(session_id=session_id).all()
    out = []
    for r in recs:
        t = db.get(Trainee, r.trainee_id) if r.trainee_id else None
        out.append({
            "id": r.id, "trainee_id": r.trainee_id,
            "name": t.name_ar if t else r.zoom_name, "zoom_name": r.zoom_name,
            "email": t.email if t else r.zoom_email,
            "minutes": round(r.total_minutes, 1), "percentage": r.percentage,
            "status": r.status, "flags": r.flags, "disconnects": r.disconnect_count,
            "first_join": fmt_time_local(r.first_join), "last_leave": fmt_time_local(r.last_leave),
            "merged_intervals": r.merged_intervals,
            "match_method": r.match_method, "match_confidence": r.match_confidence,
            "needs_review": r.needs_review, "excluded": r.excluded,
        })
    order = {"absent": 0, "partial": 1, "late": 2, "early_leave": 3, "present": 4, "needs_review": -1}
    out.sort(key=lambda x: (order.get(x["status"], 9), -x["percentage"]))
    return {"session": _session(s), "records": out}


@router.get("/{session_id}/run")
def session_run(session_id: int, db: DBSession = Depends(get_db)):
    run = db.query(WorkflowRun).filter_by(session_id=session_id) \
        .order_by(WorkflowRun.created_at.desc()).first()
    return {"run": _run(run)}


@router.post("/{session_id}/close", status_code=202)
def close_session(session_id: int, actor: str = Depends(current_user),
                  db: DBSession = Depends(get_db)):
    s = db.get(Sess, session_id)
    if not s:
        raise NotFound("الجلسة مش موجودة")
    active = db.query(WorkflowRun).filter(
        WorkflowRun.session_id == session_id,
        WorkflowRun.status.in_(["running", "paused", "awaiting_approval"])).first()
    if active:
        raise Conflict("فيه إغلاق شغال للجلسة دي بالفعل", run_id=active.id)
    res = start_workflow.delay("close_session", {"session_id": session_id}, actor)
    run_id = res.get() if res.ready() else None       # eager mode returns immediately
    return {"run_id": run_id["run_id"] if run_id else None,
            "status": run_id["status"] if run_id else "queued", "session_id": session_id}
