"""Explainable priority ranking (/prioritize). Same formula the backend uses locally."""
WEIGHTS = {"deadline": 3.0, "affected": 2.5, "blocking": 3.0, "age": 1.5, "kind": 1.0}
KIND_SCORE = {"decision": 1.0, "review": 0.8, "task": 0.5, "info": 0.2}


def score(item: dict) -> tuple[float, list[str]]:
    reasons: list[str] = []
    s = 0.0
    h = item.get("hours_to_deadline")
    if h is not None:
        ds = 1.0 if h <= 0 else max(0.0, 1.0 - min(h, 168) / 168)
        s += WEIGHTS["deadline"] * ds
        if h <= 0:
            reasons.append("الموعد فات")
        elif h <= 24:
            reasons.append(f"باقي {int(h)} ساعة")
    n = int(item.get("affected") or 0)
    if n:
        s += WEIGHTS["affected"] * min(n, 50) / 50
        reasons.append(f"بيأثر على {n} شخص")
    if item.get("blocking"):
        s += WEIGHTS["blocking"]
        reasons.append("بيوقف خطوات تانية")
    age = float(item.get("age_hours") or 0)
    if age:
        s += WEIGHTS["age"] * min(age, 72) / 72
        if age >= 12:
            reasons.append(f"معلّق من {int(age)} ساعة")
    kind = item.get("kind", "task")
    s += WEIGHTS["kind"] * KIND_SCORE.get(kind, 0.5)
    if kind == "decision":
        reasons.append("محتاج قرارك")
    return round(s, 2), reasons


def prioritize(items: list[dict]) -> dict:
    ranked = []
    for it in items:
        s, reasons = score(it)
        ranked.append({**it, "score": s, "reasons": reasons,
                       "reasoning": " · ".join(reasons) if reasons else "بند عادي"})
    ranked.sort(key=lambda x: -x["score"])
    for i, x in enumerate(ranked, 1):
        x["rank"] = i
    top = ranked[:3]
    text = " — ".join(f"{x['rank']}. {x.get('title', x.get('id'))} ({x['reasoning']})" for x in top)
    return {"ranked": ranked, "top_3": top, "reasoning": text}
