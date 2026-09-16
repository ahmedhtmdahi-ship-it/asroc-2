from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.api.deps import current_user
from app.api.schemas import ConfirmIn
from app.core.errors import Conflict, NotFound
from app.core.events import publish
from app.core.logging import record_activity
from app.core.timeutil import fmt_date_ar, fmt_time_local, utcnow
from app.db import get_db
from app.models.attendance import AttendanceRecord
from app.models.session import Session as Sess
from app.models.trainee import Trainee
from app.models.workflow import WorkflowRun
from app.tasks.attendance import resume_workflow

router = APIRouter(dependencies=[Depends(current_user)])


def _review(db, r: AttendanceRecord) -> dict:
    sugg = []
    for s in r.suggestions or []:
        t = db.get(Trainee, s["trainee_id"])
        sugg.append({**s, "name_ar": t.name_ar if t else "?", "email": t.email if t else None})
    return {"review_id": r.id, "session_id": r.session_id, "zoom_name": r.zoom_name,
            "zoom_email": r.zoom_email, "total_minutes": round(r.total_minutes),
            "merged_intervals": [[fmt_time_local(_p(a)), fmt_time_local(_p(b))]
                                 for a, b in r.merged_intervals],
            "merged_intervals_iso": r.merged_intervals, "disconnects": r.disconnect_count,
            "suggestions": sugg, "match_method": r.match_method}


def _p(s: str):
    from datetime import datetime
    return datetime.fromisoformat(s)


def _resume_if_done(db, session_id: int) -> int:
    left = db.query(AttendanceRecord).filter_by(session_id=session_id, needs_review=True).count()
    if left == 0:
        run = db.query(WorkflowRun).filter(
            WorkflowRun.status == "paused", WorkflowRun.pause_reason == "needs_review",
            WorkflowRun.session_id == session_id).first()
        if run:
            resume_workflow.delay(run.id)
    return left


@router.get("/pending")
def pending(session_id: int | None = None, db: DBSession = Depends(get_db)):
    q = db.query(AttendanceRecord).filter_by(needs_review=True)
    if session_id:
        q = q.filter_by(session_id=session_id)
    recs = q.order_by(AttendanceRecord.session_id, AttendanceRecord.id).all()
    sessions = {}
    for r in recs:
        if r.session_id not in sessions:
            s = db.get(Sess, r.session_id)
            all_recs = db.query(AttendanceRecord).filter_by(session_id=r.session_id).all()
            roster = db.query(Trainee).filter_by(project_id=s.project_id, status="active").all()
            sessions[r.session_id] = {
                "id": s.id, "title": s.title, "project": s.project.name,
                "date": fmt_date_ar(s.planned_start),
                "planned_start": fmt_time_local(s.planned_start),
                "planned_end": fmt_time_local(s.planned_end),
                "planned_minutes": s.planned_minutes,
                "stats": {"auto_matched": sum(1 for x in all_recs if x.trainee_id and not x.needs_review),
                          "needs_review": sum(1 for x in all_recs if x.needs_review),
                          "unmatched": sum(1 for x in all_recs if not x.trainee_id and not x.needs_review)},
                "roster": [{"trainee_id": t.id, "name_ar": t.name_ar, "name_en": t.name_en,
                            "email": t.email} for t in roster],
            }
    return {"sessions": list(sessions.values()), "reviews": [_review(db, r) for r in recs]}


@router.post("/{review_id}/confirm")
def confirm(review_id: int, body: ConfirmIn, actor: str = Depends(current_user),
            db: DBSession = Depends(get_db)):
    r = db.get(AttendanceRecord, review_id)
    if not r:
        raise NotFound("المراجعة مش موجودة")
    if not r.needs_review:
        return {"ok": True, "remaining": _count_left(db, r.session_id), "already": True}
    t = db.get(Trainee, body.trainee_id)
    if not t:
        raise NotFound("المتدرب مش موجود")
    taken = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == r.session_id, AttendanceRecord.trainee_id == t.id,
        AttendanceRecord.id != r.id).first()
    if taken:
        raise Conflict(f"{t.name_ar} متسجل بالفعل في الجلسة دي باسم Zoom «{taken.zoom_name}»")

    before = {"trainee_id": r.trainee_id, "needs_review": True}
    r.trainee_id, r.needs_review = t.id, False
    r.match_confidence, r.match_method = 1.0, "manual"
    r.reviewed_by, r.reviewed_at = actor, utcnow()
    learned = t.add_alias(r.zoom_name) if r.zoom_name else False   # every confirmation teaches
    db.commit()
    record_activity("review_confirmed", target_type="attendance", target_id=r.id, before=before,
                    after={"trainee_id": t.id, "zoom_name": r.zoom_name, "alias_saved": learned})
    left = _resume_if_done(db, r.session_id)
    publish("review", session_id=r.session_id, remaining=left)
    return {"ok": True, "remaining": left, "alias_saved": learned, "trainee": t.name_ar}


@router.post("/{review_id}/reject")
def reject(review_id: int, actor: str = Depends(current_user), db: DBSession = Depends(get_db)):
    """'Not a trainee' — keep the row for the audit trail, drop it from attendance."""
    r = db.get(AttendanceRecord, review_id)
    if not r:
        raise NotFound("المراجعة مش موجودة")
    if not r.needs_review:
        return {"ok": True, "remaining": _count_left(db, r.session_id), "already": True}
    r.needs_review, r.excluded, r.trainee_id = False, True, None
    r.match_method, r.reviewed_by, r.reviewed_at = "rejected", actor, utcnow()
    db.commit()
    record_activity("review_rejected", target_type="attendance", target_id=r.id,
                    after={"zoom_name": r.zoom_name})
    left = _resume_if_done(db, r.session_id)
    publish("review", session_id=r.session_id, remaining=left)
    return {"ok": True, "remaining": left}


def _count_left(db, session_id: int) -> int:
    return db.query(AttendanceRecord).filter_by(session_id=session_id, needs_review=True).count()
