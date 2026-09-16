from app.intent import parse

CTX = {
    "active_programs": [{"id": 3, "name": "React"}, {"id": 4, "name": "Flutter"},
                        {"id": 5, "name": "Power BI"}],
    "recent_sessions": [
        {"id": 410, "program_id": 3, "date": "2026-08-10", "title": "React", "status": "scheduled"},
        {"id": 412, "program_id": 3, "date": "2026-08-12", "title": "React", "status": "scheduled"},
        {"id": 420, "program_id": 4, "date": "2026-08-12", "title": "Flutter", "status": "scheduled"},
        {"id": 430, "program_id": 5, "date": "2026-08-11", "title": "Power BI", "status": "closed"},
    ],
    "now": "2026-08-13T09:00:00",
}


def test_close_with_program_ambiguous_asks_one_question():
    r = parse("اقفل سيشن رياكت", CTX)
    assert r["intent"] == "close_session"
    assert r["entities"]["program_id"] == 3
    assert r["entities"]["session_id"] is None
    c = r["clarification_needed"]
    assert c and len(c["options"]) == 2 and {o["session_id"] for o in c["options"]} == {410, 412}
    assert "2" in c["question"] or "٢" in c["question"]


def test_close_with_date_resolves():
    r = parse("اقفل سيشن React امبارح", CTX)
    assert r["entities"] == {"program_id": 3, "session_id": 412}
    assert r["clarification_needed"] is None
    assert r["confidence"] >= 0.9


def test_close_unique_program_resolves():
    r = parse("قفل جلسة فلاتر", CTX)
    assert r["entities"]["session_id"] == 420


def test_close_closed_program_has_no_options():
    r = parse("اقفل باور بي اي", CTX)
    assert r["intent"] == "close_session"
    assert r["clarification_needed"]["options"] == []


def test_close_english():
    r = parse("close the react session from yesterday", CTX)
    assert r["entities"]["session_id"] == 412


def test_reminders():
    r = parse("ابعت التذكيرات بتاعة الفيدباك", CTX)
    assert r["intent"] == "send_reminders"


def test_brief():
    assert parse("ملخص النهاردة", CTX)["intent"] == "daily_brief"
    assert parse("صباح الخير", CTX)["intent"] == "daily_brief"


def test_search_extracts_query():
    r = parse("دوّر على أحمد محمود", CTX)
    assert r["intent"] == "search"
    assert r["entities"]["query"] == "احمد محمود"


def test_unknown():
    r = parse("هاي", CTX)
    assert r["intent"] == "unknown" and r["clarification_needed"]["question"]


def test_ids_only_from_context():
    r = parse("اقفل سيشن React", {"active_programs": [{"id": 3, "name": "React"}],
                                   "recent_sessions": []})
    assert r["entities"].get("session_id") is None
