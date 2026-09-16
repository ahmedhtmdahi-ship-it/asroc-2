"""Rule-based Egyptian-Arabic intent parser. Structured output, validated against context.

Intents: close_session · send_reminders · daily_brief · search · unknown
One consolidated clarification when something is missing — never five small ones.
"""
import re
from datetime import date, datetime, timedelta

from rapidfuzz import fuzz

from app.normalize import normalize_ar

INTENT_PATTERNS = {
    "close_session": r"(اقفل|إقفل|اغلق|أغلق|قفل|اقفلي|اغلقي|اقفلها|اقفله|إغلاق|اغلاق|قفلة|close|finish|wrap)",
    "send_reminders": r"(تذكير|تذكيرات|ذكر|ذكّر|فكر|فكّر|remind|reminder|reminders|فيدباك|feedback)",
    "daily_brief": r"(ملخص|الملخص|brief|بريف|اجندة|أجندة|صباح الخير|ايه الاخبار|إيه الأخبار|ايه الجديد|النهارده|النهاردة|اعمل ايه|أعمل إيه|summary)",
    "search": r"(دور|دوّر|ابحث|بحث|search|find|فين|شوفلي|شوف لي|هات لي|هاتلي|مين هو|مين هي|بيانات)",
}
SESSION_WORDS = r"(سيشن|سيشين|السيشن|جلسة|جلسه|الجلسة|الجلسه|session|محاضرة|محاضره|لقاء)"
PROGRAM_ALIASES = {
    "react": ["react", "رياكت", "ريأكت", "رياكت جي اس", "reactjs", "react.js"],
    "flutter": ["flutter", "فلاتر", "فلتر"],
    "power bi": ["power bi", "powerbi", "باور بي اي", "باور بى", "بور بي", "power"],
    "python": ["python", "بايثون", "بيثون"],
    "ui/ux": ["ui/ux", "ui ux", "uiux", "يو اي", "يو آي", "ux", "ui"],
    "data": ["data", "داتا", "بيانات"],
    "node": ["node", "نود", "nodejs", "node.js"],
    "angular": ["angular", "انجولار", "أنجولار"],
    "java": ["java", "جافا"],
    "android": ["android", "اندرويد", "أندرويد"],
    "ios": ["ios", "اي او اس", "آي او إس"],
    "excel": ["excel", "اكسل", "إكسل"],
}
AR_DAYS = {"الاحد": 6, "الأحد": 6, "الاتنين": 0, "الاثنين": 0, "الإثنين": 0, "التلات": 1,
           "الثلاثاء": 1, "التلاتاء": 1, "الاربع": 2, "الأربعاء": 2, "الاربعاء": 2,
           "الخميس": 3, "الجمعة": 4, "الجمعه": 4, "السبت": 5}
AR_MONTHS = ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "اغسطس",
             "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر"]
AR_DAYNAMES = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]


def detect_intent(text: str) -> tuple[str, float]:
    t = normalize_ar(text)
    raw = text.lower()
    for intent, pat in INTENT_PATTERNS.items():
        if re.search(pat, t) or re.search(pat, raw):
            conf = 0.9
            if intent == "close_session" and re.search(SESSION_WORDS, t):
                conf = 0.95
            return intent, conf
    return "unknown", 0.2


def find_program(text: str, programs: list[dict]) -> tuple[int | None, float]:
    t = normalize_ar(text)
    best_id, best = None, 0.0
    for p in programs:
        pname = normalize_ar(p["name"])
        cands = {pname}
        for key, aliases in PROGRAM_ALIASES.items():
            if key in pname or pname in key:
                cands.update(normalize_ar(a) for a in aliases)
        for c in cands:
            if not c:
                continue
            if re.search(rf"(^|\s){re.escape(c)}(\s|$)", t):
                s = 1.0
            else:
                s = fuzz.partial_ratio(c, t) / 100.0
                if len(c) <= 3:
                    s = 0.0            # too short to fuzzy-match safely
            if s > best:
                best_id, best = p["id"], s
    return (best_id, best) if best >= 0.85 else (None, 0.0)


def find_date(text: str, today: date) -> date | None:
    t = normalize_ar(text)
    if re.search(r"(امبارح|إمبارح|yesterday)", t):
        return today - timedelta(days=1)
    if re.search(r"(النهارده|النهاردة|today|اليوم)", t):
        return today
    if re.search(r"(اول امبارح|أول إمبارح)", t):
        return today - timedelta(days=2)
    for name, wd in AR_DAYS.items():
        if normalize_ar(name) in t:
            delta = (today.weekday() - wd) % 7
            return today - timedelta(days=delta or 7)
    m = re.search(r"(\d{1,2})\s*(" + "|".join(AR_MONTHS) + ")", t)
    if m:
        try:
            return date(today.year, AR_MONTHS.index(m.group(2)) + 1, int(m.group(1)))
        except ValueError:
            return None
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", t)
    if m:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return None


def _label(s: dict) -> str:
    if s.get("label"):
        return s["label"]
    d = date.fromisoformat(s["date"])
    return f"{s.get('title', '')} — {AR_DAYNAMES[d.weekday()]} {d.day} {AR_MONTHS[d.month - 1]}".strip(" —")


def parse(text: str, context: dict) -> dict:
    programs = context.get("active_programs") or []
    sessions = context.get("recent_sessions") or []
    now = context.get("now")
    today = datetime.fromisoformat(now).date() if now else date.today()

    intent, conf = detect_intent(text)
    out = {"intent": intent, "entities": {}, "confidence": conf, "clarification_needed": None}
    program_id, pconf = find_program(text, programs)
    if program_id:
        out["entities"]["program_id"] = program_id

    if intent == "close_session":
        cands = [s for s in sessions if s.get("status") != "closed"]
        if program_id:
            cands = [s for s in cands if s["program_id"] == program_id]
        target = find_date(text, today)
        if target:
            dated = [s for s in cands if s.get("date") == target.isoformat()]
            if dated:
                cands = dated
        if len(cands) == 1:
            out["entities"]["session_id"] = cands[0]["id"]
            out["entities"]["program_id"] = cands[0]["program_id"]
            out["confidence"] = round(min(0.98, conf + 0.03), 2)
        elif not cands:
            out["confidence"] = 0.6
            out["clarification_needed"] = {
                "question": ("مفيش جلسات مفتوحة للبرنامج ده" if program_id else
                             "مفيش جلسات مفتوحة دلوقتي — تحب تقفل أنهي جلسة؟"),
                "options": []}
        else:
            out["entities"]["session_id"] = None
            out["confidence"] = 0.71
            pname = next((p["name"] for p in programs if p["id"] == program_id), None)
            q = (f"فيه {len(cands)} جلسات {pname} لسه مقفلتش — أنهي واحدة؟" if pname
                 else f"فيه {len(cands)} جلسات مفتوحة — أنهي واحدة (وأنهي برنامج)؟")
            out["clarification_needed"] = {
                "question": q,
                "options": [{"session_id": s["id"], "label": _label(s)} for s in cands[:8]]}
        return out

    if intent == "search":
        q = normalize_ar(text)
        q = re.sub(INTENT_PATTERNS["search"] + r"\s*(?:علي|على|عن|لي|ل|for|about|me)?\s*", " ", q)
        out["entities"]["query"] = re.sub(r"\s+", " ", q).strip()
        return out

    if intent == "unknown":
        out["clarification_needed"] = {
            "question": "مش فاهم الأمر ده لسه. تقدر تقول: «اقفل سيشن React»، «ابعت التذكيرات»، "
                        "«ملخص النهاردة»، أو «دوّر على أحمد»",
            "options": []}
    return out
