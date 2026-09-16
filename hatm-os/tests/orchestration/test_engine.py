import pytest

from app.models.workflow import WorkflowRun
from app.orchestration.engine import Definition, PauseSignal, Step, WorkflowEngine, register


def _defn(name, calls):
    def s1(ctx):
        calls.append("s1")
        return {"a": 1}

    def s2(ctx):
        calls.append("s2")
        if not ctx.get("go"):
            raise PauseSignal("approval", resume_token="x")
        return {"b": ctx["a"] + 1}

    def s3(ctx):
        calls.append("s3")
        return {"c": ctx["b"] + 1}

    return register(Definition(name, [Step("s1", s1), Step("s2", s2), Step("s3", s3)]))


def test_pause_and_resume_from_db(db):
    calls = []
    _defn("t_pause", calls)
    eng = WorkflowEngine()
    run = eng.start("t_pause", {"x": 0})
    assert run.status == "awaiting_approval"
    assert run.current_step == "s2"
    assert calls == ["s1", "s2"]

    fresh = db.get(WorkflowRun, run.id)
    assert fresh.context["a"] == 1                        # state persisted, not in memory

    run = eng.resume(run.id, {"go": True})
    assert run.status == "completed"
    assert run.context["c"] == 3
    assert calls == ["s1", "s2", "s2", "s3"]               # s1 not re-run


def test_retryable_step_pauses_then_fails(db):
    n = {"i": 0}

    def flaky(ctx):
        n["i"] += 1
        raise RuntimeError("boom")

    register(Definition("t_retry", [Step("f", flaky, retryable=True, max_retries=2)]))
    eng = WorkflowEngine()
    run = eng.start("t_retry", {})
    assert run.status == "paused" and run.pause_reason == "retry" and run.retry_count == 1
    run = eng.resume(run.id)
    assert run.status == "paused" and run.retry_count == 2
    with pytest.raises(RuntimeError):
        eng.resume(run.id)
    assert db.get(WorkflowRun, run.id).status == "failed"


def test_completed_run_is_not_rerun(db):
    calls = []
    _defn("t_done", calls)
    eng = WorkflowEngine()
    run = eng.start("t_done", {"go": True})
    assert run.status == "completed"
    eng.resume(run.id)
    assert calls == ["s1", "s2", "s3"]
