"""A deliberately small, resumable, sequential workflow engine.

State lives in `WorkflowRun.context` — never only in memory — so a run can pause
for review/approval and resume hours later, from another process.
"""
import logging
from collections.abc import Callable
from dataclasses import dataclass, field

from app.core.errors import AppError, NotFound
from app.core.events import publish
from app.core.logging import record_activity, set_run
from app.core.timeutil import utcnow
from app.db import SessionLocal
from app.models.workflow import WorkflowRun

log = logging.getLogger("hatm.workflow")


class PauseSignal(Exception):
    """A step says: I need a human, or I need to wait."""

    def __init__(self, reason: str, resume_token: str | None = None,
                 retry_after: int | None = None, message: str | None = None,
                 context: dict | None = None):
        super().__init__(message or reason)
        self.reason = reason
        self.resume_token = resume_token
        self.retry_after = retry_after
        self.message = message
        self.context = context or {}      # partial state to persist before pausing


@dataclass
class Step:
    name: str
    handler: Callable[[dict], dict | None]
    label: str = ""
    retryable: bool = False
    max_retries: int = 3


@dataclass
class Definition:
    name: str
    steps: list[Step] = field(default_factory=list)

    def step_index(self, name: str) -> int:
        for i, s in enumerate(self.steps):
            if s.name == name:
                return i
        return 0

    def step_labels(self) -> list[dict]:
        return [{"name": s.name, "label": s.label or s.name} for s in self.steps]


REGISTRY: dict[str, Definition] = {}


def register(defn: Definition) -> Definition:
    REGISTRY[defn.name] = defn
    return defn


def _event(run: WorkflowRun, kind: str, **data) -> None:
    run.events = list(run.events or []) + [{"at": utcnow().isoformat(), "kind": kind,
                                            "step": run.current_step, **data}]
    publish("workflow", run_id=run.id, status=run.status, step=run.current_step,
            session_id=run.session_id, event=kind, **data)


class WorkflowEngine:
    def start(self, definition: str, context: dict) -> WorkflowRun:
        if definition not in REGISTRY:
            raise AppError(f"workflow '{definition}' مش معرّف")
        db = SessionLocal()
        try:
            run = WorkflowRun(definition=definition, context=dict(context), status="running",
                              session_id=context.get("session_id"))
            db.add(run)
            db.commit()
            run_id = run.id
        finally:
            db.close()
        record_activity("workflow_started", target_type="workflow", target_id=run_id,
                        after={"definition": definition, "context": context})
        return self.resume(run_id)

    def resume(self, run_id: str, extra_context: dict | None = None) -> WorkflowRun:
        db = SessionLocal()
        try:
            run = db.get(WorkflowRun, run_id)
            if not run:
                raise NotFound(f"workflow run {run_id} مش موجود")
            if run.status in ("completed", "cancelled"):
                return run

            defn = REGISTRY[run.definition]
            set_run(run.id)

            ctx = {**run.context, "_run_id": run.id}
            if extra_context:
                ctx.update(extra_context)
            run.context = ctx
            run.status = "running"
            run.pause_reason = None
            _event(run, "resumed" if run.current_step else "started")
            db.commit()

            start_at = 0
            if run.current_step:
                start_at = defn.step_index(run.current_step)
                if run.current_step in (run.completed_steps or []):
                    start_at += 1

            for step in defn.steps[start_at:]:
                run.current_step = step.name
                _event(run, "step_started")
                db.commit()
                try:
                    result = step.handler(dict(run.context)) or {}
                    run.context = {**run.context, **result}
                    run.completed_steps = list(run.completed_steps or []) + [step.name]
                    run.retry_count = 0
                    _event(run, "step_done", detail=result.get("_detail"))
                    db.commit()

                except PauseSignal as p:
                    run.status = "awaiting_approval" if p.reason == "approval" else "paused"
                    run.pause_reason = p.reason
                    run.resume_token = p.resume_token
                    run.context = {**run.context, **p.context}
                    if p.retry_after:
                        run.context = {**run.context, "_retry_after": p.retry_after}
                    _event(run, "paused", reason=p.reason, message=p.message)
                    db.commit()
                    record_activity("workflow_paused", target_type="workflow", target_id=run.id,
                                    after={"step": step.name, "reason": p.reason})
                    return run

                except Exception as e:  # noqa: BLE001 — recorded, then re-raised or retried
                    err = f"{step.name}: {type(e).__name__}: {e}"[:1000]
                    if step.retryable and run.retry_count < step.max_retries:
                        run.retry_count += 1
                        run.status = "paused"
                        run.pause_reason = "retry"
                        run.error = err
                        _event(run, "retry_scheduled", attempt=run.retry_count, error=err)
                        db.commit()
                        log.warning("step %s failed, retry %s/%s: %s", step.name,
                                    run.retry_count, step.max_retries, err)
                        return run
                    run.status = "failed"
                    run.error = err
                    _event(run, "failed", error=err)
                    db.commit()
                    record_activity("workflow_failed", target_type="workflow", target_id=run.id,
                                    result="failure", error=err)
                    raise

            run.status = "completed"
            run.current_step = None
            _event(run, "completed")
            db.commit()
            record_activity("workflow_completed", target_type="workflow", target_id=run.id)
            return run
        finally:
            set_run(None)
            db.close()

    def cancel(self, run_id: str) -> WorkflowRun:
        db = SessionLocal()
        try:
            run = db.get(WorkflowRun, run_id)
            if not run:
                raise NotFound("workflow run مش موجود")
            if run.status not in ("completed", "cancelled"):
                run.status = "cancelled"
                _event(run, "cancelled")
                db.commit()
            return run
        finally:
            db.close()


engine = WorkflowEngine()
