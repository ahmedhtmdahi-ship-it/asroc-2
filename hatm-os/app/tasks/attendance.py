from datetime import timedelta

from app.celery_app import celery
from app.config import settings
from app.core.logging import set_actor
from app.core.timeutil import utcnow
from app.db import SessionLocal
from app.models.session import Session as Sess
from app.models.workflow import WorkflowRun
from app.orchestration import flows  # noqa: F401 — register definitions
from app.orchestration.approval import ApprovalGate
from app.orchestration.engine import engine


@celery.task(name="tasks.resume_workflow", bind=True, max_retries=3)
def resume_workflow(self, run_id: str, extra: dict | None = None):
    set_actor("system", "scheduler")
    try:
        run = engine.resume(run_id, extra)
        return {"run_id": run.id, "status": run.status}
    except Exception as e:  # noqa: BLE001
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries)) from e


@celery.task(name="tasks.start_workflow")
def start_workflow(definition: str, context: dict, actor: str = "system"):
    set_actor("system" if actor == "system" else "human", actor)
    run = engine.start(definition, context)
    return {"run_id": run.id, "status": run.status}


@celery.task(name="tasks.check_zoom_reports")
def check_zoom_reports():
    """Runs paused because the Zoom report wasn't ready (or a retryable error) → try again."""
    db = SessionLocal()
    try:
        cutoff = utcnow() - timedelta(minutes=settings.zoom_report_retry_minutes)
        runs = db.query(WorkflowRun).filter(
            WorkflowRun.status == "paused",
            WorkflowRun.pause_reason.in_(["zoom_report_not_ready", "retry"]),
            WorkflowRun.updated_at <= cutoff,
        ).limit(20).all()
        for r in runs:
            resume_workflow.delay(r.id)
        return len(runs)
    finally:
        db.close()


@celery.task(name="tasks.expire_approvals")
def expire_approvals():
    return ApprovalGate().expire_stale()


@celery.task(name="tasks.auto_close_sessions")
def auto_close_sessions():
    """Behind FF_AUTO_CLOSE_SESSION: start close_session 45 min after planned end."""
    if not settings.ff_auto_close_session:
        return 0
    db = SessionLocal()
    try:
        cutoff = utcnow() - timedelta(minutes=45)
        sessions = db.query(Sess).filter(Sess.status == "scheduled",
                                         Sess.planned_end <= cutoff,
                                         Sess.zoom_meeting_id.isnot(None)).limit(10).all()
        for s in sessions:
            exists = db.query(WorkflowRun).filter(
                WorkflowRun.session_id == s.id,
                WorkflowRun.status.notin_(["completed", "cancelled", "failed"])).first()
            if not exists:
                start_workflow.delay("close_session", {"session_id": s.id})
        return len(sessions)
    finally:
        db.close()
