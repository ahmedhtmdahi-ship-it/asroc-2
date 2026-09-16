"""ActivityLog decorator + structured JSON logging.

Every adapter boundary and workflow transition goes through `@logged` so the
ActivityLog table is the single audit trail. The log write uses its own DB
session so it survives a rollback of the wrapped operation, and it never
raises — a failing log must not fail the operation.
"""
import contextvars
import functools
import json
import logging
import sys
import time
from collections.abc import Callable
from typing import Any

from pythonjsonlogger import jsonlogger

_actor: contextvars.ContextVar[tuple[str, str | None]] = contextvars.ContextVar(
    "actor", default=("system", None))
_run_id: contextvars.ContextVar[str | None] = contextvars.ContextVar("run_id", default=None)


def set_actor(actor_type: str, actor_id: str | None = None) -> None:
    _actor.set((actor_type, actor_id))


def get_actor() -> tuple[str, str | None]:
    return _actor.get()


def set_run(run_id: str | None) -> None:
    _run_id.set(run_id)


def get_run() -> str | None:
    return _run_id.get()


def _safe(obj: Any) -> Any:
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return {"repr": str(obj)[:500]}


def record_activity(action: str, *, target_type: str | None = None,
                    target_id: str | None = None, before: Any = None, after: Any = None,
                    result: str = "success", error: str | None = None,
                    duration_ms: int | None = None) -> None:
    """Write one ActivityLog row in an independent session. Never raises."""
    from app.db import SessionLocal
    from app.models.activity import ActivityLog

    actor_type, actor_id = _actor.get()
    db = SessionLocal()
    try:
        db.add(ActivityLog(
            actor_type=actor_type, actor_id=actor_id, action=action,
            target_type=target_type,
            target_id=str(target_id)[:50] if target_id is not None else None,
            before=_safe(before), after=_safe(after), result=result,
            error=error[:1000] if error else None, duration_ms=duration_ms,
            workflow_run_id=_run_id.get(),
        ))
        db.commit()
    except Exception:  # noqa: BLE001 — logging must never break the caller
        db.rollback()
        logging.getLogger("hatm.activity").exception("activity log write failed")
    finally:
        db.close()


def logged(action: str, target_type: str | None = None,
           capture_before: Callable | None = None,
           capture_after: Callable | None = None,
           target_arg: str = "session_id"):
    """
    @logged("write_attendance_sheet", target_type="session")
    def write(session_id: int, ...): ...

    capture_before(*args, **kwargs) / capture_after(result) → JSON-able dicts.
    target id = kwargs[target_arg] or the first positional argument.
    """
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            t0 = time.perf_counter()
            before = None
            if capture_before:
                try:
                    before = capture_before(*args, **kwargs)
                except Exception:  # noqa: BLE001
                    before = {"capture_error": True}

            result, error, ok = None, None, True
            try:
                result = fn(*args, **kwargs)
                return result
            except Exception as e:
                ok, error = False, f"{type(e).__name__}: {e}"
                raise
            finally:
                after = None
                if ok and capture_after:
                    try:
                        after = capture_after(result)
                    except Exception:  # noqa: BLE001
                        after = {"capture_error": True}
                tid = kwargs.get(target_arg)
                if tid is None and args:
                    tid = args[0] if not hasattr(args[0], "__dict__") else (
                        args[1] if len(args) > 1 else None)
                record_activity(
                    action, target_type=target_type, target_id=tid,
                    before=before, after=after,
                    result="success" if ok else "failure", error=error,
                    duration_ms=int((time.perf_counter() - t0) * 1000),
                )
        return wrapper
    return deco


def setup_json_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    if any(isinstance(h.formatter, jsonlogger.JsonFormatter) for h in root.handlers):
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"))
    root.handlers = [handler]
    root.setLevel(level)


log = logging.getLogger("hatm")
