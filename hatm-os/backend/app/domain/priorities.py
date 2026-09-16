"""Explainable priority ranking for Mission Control. Pure: items in → ranked items out."""
from dataclasses import dataclass, field

WEIGHTS = {
    "deadline": 3.0,       # how close the deadline is
    "affected": 2.5,       # how many people are affected
    "blocking": 3.0,       # does it block something else
    "age": 1.5,            # how long it has been pending
    "kind": 1.0,           # decision > task > info
}
KIND_SCORE = {"decision": 1.0, "review": 0.8, "task": 0.5, "info": 0.2}


@dataclass
class PriorityItem:
    id: str
    title: str
    kind: str = "task"                 # decision | review | task | info
    affected: int = 0
    hours_to_deadline: float | None = None
    blocking: bool = False
    age_hours: float = 0
    action_label: str = "افتح"
    action_url: str = "/"
    extra: dict = field(default_factory=dict)


def _deadline_score(h: float | None) -> float:
    if h is None:
        return 0.0
    if h <= 0:
        return 1.0
    return max(0.0, 1.0 - min(h, 168) / 168)      # 1 week horizon


def _affected_score(n: int) -> float:
    return min(n, 50) / 50


def _age_score(h: float) -> float:
    return min(h, 72) / 72


def score(item: PriorityItem) -> tuple[float, list[str]]:
    reasons: list[str] = []
    s = 0.0

    ds = _deadline_score(item.hours_to_deadline)
    if ds > 0:
        s += WEIGHTS["deadline"] * ds
        if item.hours_to_deadline is not None and item.hours_to_deadline <= 0:
            reasons.append("الموعد فات")
        elif item.hours_to_deadline is not None and item.hours_to_deadline <= 24:
            reasons.append(f"باقي {int(item.hours_to_deadline)} ساعة")

    a = _affected_score(item.affected)
    if a > 0:
        s += WEIGHTS["affected"] * a
        reasons.append(f"بيأثر على {item.affected} شخص")

    if item.blocking:
        s += WEIGHTS["blocking"]
        reasons.append("بيوقف خطوات تانية")

    ag = _age_score(item.age_hours)
    if ag > 0:
        s += WEIGHTS["age"] * ag
        if item.age_hours >= 12:
            reasons.append(f"معلّق من {int(item.age_hours)} ساعة")

    s += WEIGHTS["kind"] * KIND_SCORE.get(item.kind, 0.5)
    if item.kind == "decision":
        reasons.append("محتاج قرارك")

    return round(s, 2), reasons


def rank(items: list[PriorityItem], top: int = 3) -> list[dict]:
    scored = []
    for it in items:
        s, reasons = score(it)
        scored.append({
            "id": it.id, "title": it.title, "kind": it.kind, "score": s,
            "reasoning": " · ".join(reasons) if reasons else "بند عادي",
            "reasons": reasons, "action_label": it.action_label,
            "action_url": it.action_url, "affected": it.affected, **it.extra,
        })
    scored.sort(key=lambda x: -x["score"])
    for i, x in enumerate(scored, 1):
        x["rank"] = i
    return scored[:top] if top else scored
