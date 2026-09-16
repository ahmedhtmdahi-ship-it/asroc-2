"""Attendance rules: from a DurationResult + project rules → status. Pure."""
from dataclasses import dataclass, field
from datetime import datetime

from app.domain.duration import DurationResult

DEFAULT_RULES: dict = {
    "basis": "planned_duration",          # or "actual_duration"
    "late_threshold_min": 15,
    "early_leave_threshold_min": 10,
    "thresholds": [
        {"status": "present", "min_pct": 80},
        {"status": "partial", "min_pct": 50},
        {"status": "absent", "min_pct": 0},
    ],
    "modifiers": {
        "flag_review_if_disconnects_gt": 3,
    },
}


@dataclass
class Evaluation:
    status: str
    percentage: float
    flags: list[str] = field(default_factory=list)

    @property
    def needs_review(self) -> bool:
        return "needs_review" in self.flags


def merge_rules(rules: dict | None) -> dict:
    r = {**DEFAULT_RULES, **(rules or {})}
    r["modifiers"] = {**DEFAULT_RULES["modifiers"], **((rules or {}).get("modifiers") or {})}
    return r


def min_required_pct(rules: dict | None = None) -> int:
    r = merge_rules(rules)
    for t in r["thresholds"]:
        if t["status"] == "present":
            return int(t["min_pct"])
    return 80


def evaluate(d: DurationResult, basis_minutes: float,
             rules: dict | None = None) -> Evaluation:
    """Same inputs → same output, always. That is what makes replays possible."""
    r = merge_rules(rules)
    flags: list[str] = []

    if basis_minutes <= 0:
        return Evaluation("needs_review", 0.0, ["invalid_basis", "needs_review"])

    pct = round(d.total_minutes / basis_minutes * 100, 1)

    status = "absent"
    for t in sorted(r["thresholds"], key=lambda x: -x["min_pct"]):
        if pct >= t["min_pct"]:
            status = t["status"]
            break

    limit = r["modifiers"].get("flag_review_if_disconnects_gt")
    if limit is not None and d.disconnect_count > limit:
        flags += ["many_disconnects", "needs_review"]

    return Evaluation(status, pct, flags)


def apply_timing_modifiers(ev: Evaluation, d: DurationResult,
                           window_start: datetime, window_end: datetime,
                           rules: dict | None = None) -> Evaluation:
    """Late / early-leave need the session boundaries, so they live here."""
    r = merge_rules(rules)
    if ev.status == "absent" or not d.first_join or not d.last_leave:
        return ev

    late_min = (d.first_join - window_start).total_seconds() / 60
    early_min = (window_end - d.last_leave).total_seconds() / 60

    status, flags = ev.status, list(ev.flags)

    if late_min > r["late_threshold_min"]:
        flags.append("late")
        if status == "present":
            status = "late"

    if early_min > r["early_leave_threshold_min"]:
        flags.append("early_leave")
        if status == "present":
            status = "early_leave"

    return Evaluation(status, ev.percentage, flags)


def evaluate_full(d: DurationResult, basis_minutes: float, window_start: datetime,
                  window_end: datetime, rules: dict | None = None) -> Evaluation:
    ev = evaluate(d, basis_minutes, rules)
    return apply_timing_modifiers(ev, d, window_start, window_end, rules)
