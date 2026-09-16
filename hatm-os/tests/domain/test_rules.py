from datetime import datetime as dt

from app.domain.duration import DurationResult
from app.domain.rules import apply_timing_modifiers, evaluate, evaluate_full, min_required_pct

S, E = dt(2026, 8, 17, 18, 0), dt(2026, 8, 17, 20, 0)


def mk(minutes, first=None, last=None, disc=0):
    return DurationResult(minutes, [(first or S, last or E)], first or S, last or E, disc)


def test_present():
    assert evaluate(mk(100), 120).status == "present"      # 83%


def test_partial():
    assert evaluate(mk(70), 120).status == "partial"       # 58%


def test_absent():
    assert evaluate(mk(30), 120).status == "absent"        # 25%


def test_boundary_exactly_80():
    assert evaluate(mk(96), 120).status == "present"


def test_boundary_just_below():
    assert evaluate(mk(95), 120).status == "partial"       # 79.2%


def test_late():
    d = mk(100, first=dt(2026, 8, 17, 18, 20))
    ev = apply_timing_modifiers(evaluate(d, 120), d, S, E)
    assert ev.status == "late"
    assert "late" in ev.flags


def test_late_but_partial_stays_partial():
    d = mk(70, first=dt(2026, 8, 17, 18, 30))
    ev = evaluate_full(d, 120, S, E)
    assert ev.status == "partial"
    assert "late" in ev.flags


def test_early_leave():
    d = mk(100, last=dt(2026, 8, 17, 19, 40))
    ev = evaluate_full(d, 120, S, E)
    assert ev.status == "early_leave"


def test_many_disconnects_flags_review():
    ev = evaluate(mk(100, disc=5), 120)
    assert ev.needs_review


def test_custom_rules():
    rules = {"thresholds": [{"status": "present", "min_pct": 90},
                            {"status": "partial", "min_pct": 60},
                            {"status": "absent", "min_pct": 0}]}
    assert evaluate(mk(100), 120, rules).status == "partial"
    assert min_required_pct(rules) == 90


def test_invalid_basis():
    ev = evaluate(mk(100), 0)
    assert ev.status == "needs_review"


def test_pure_same_input_same_output():
    a = evaluate_full(mk(77, first=dt(2026, 8, 17, 18, 16)), 120, S, E)
    b = evaluate_full(mk(77, first=dt(2026, 8, 17, 18, 16)), 120, S, E)
    assert a == b
