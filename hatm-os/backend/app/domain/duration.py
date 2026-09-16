"""Net attendance minutes from possibly-overlapping Zoom intervals. Pure."""
from dataclasses import dataclass
from datetime import datetime

Interval = tuple[datetime, datetime]


@dataclass
class DurationResult:
    total_minutes: float
    merged: list[Interval]
    first_join: datetime | None
    last_leave: datetime | None
    disconnect_count: int

    @property
    def is_empty(self) -> bool:
        return not self.merged


def compute(intervals: list[Interval], window_start: datetime,
            window_end: datetime) -> DurationResult:
    """
    One person can appear as several rows in a Zoom report (phone + laptop at
    the same time, or a dropped connection). Summing durations over-counts, so:
    clip to the session window → sort → merge overlaps/touching → sum.
    """
    clipped: list[Interval] = []
    for s, e in intervals:
        cs, ce = max(s, window_start), min(e, window_end)
        if ce > cs:
            clipped.append((cs, ce))

    if not clipped:
        return DurationResult(0.0, [], None, None, 0)

    clipped.sort(key=lambda x: x[0])

    merged: list[Interval] = [clipped[0]]
    for s, e in clipped[1:]:
        ls, le = merged[-1]
        if s <= le:                       # overlap or touching → one interval
            merged[-1] = (ls, max(le, e))
        else:
            merged.append((s, e))

    total = sum((e - s).total_seconds() for s, e in merged) / 60.0

    return DurationResult(
        total_minutes=round(total, 2),
        merged=merged,
        first_join=merged[0][0],
        last_leave=merged[-1][1],
        disconnect_count=max(0, len(merged) - 1),   # gaps between merged blocks
    )


def _norm_name(name: str | None) -> str:
    return " ".join((name or "").lower().split())


def group_by_identity(participants) -> dict[str, list]:
    """
    Group Zoom rows by identity. Priority: email > user_id > normalised name.
    Objects need `.email`, `.user_id`, `.name`.
    """
    groups: dict[str, list] = {}
    for p in participants:
        if getattr(p, "email", None):
            key = f"email:{p.email.lower().strip()}"
        elif getattr(p, "user_id", None):
            key = f"uid:{p.user_id}"
        else:
            key = f"name:{_norm_name(p.name)}"
        groups.setdefault(key, []).append(p)
    return groups
