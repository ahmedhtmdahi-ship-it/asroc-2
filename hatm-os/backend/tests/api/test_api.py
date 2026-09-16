from app.adapters.fake import FakeGmailAdapter, FakeSheetsAdapter
from app.models.approval import Approval
from app.models.attendance import AttendanceRecord


def test_health_and_openapi(client):
    assert client.get("/health").json()["status"] == "ok"
    spec = client.get("/api/openapi.json").json()
    for p in ["/api/sessions", "/api/sessions/{session_id}/attendance",
              "/api/sessions/{session_id}/close", "/api/reviews/pending",
              "/api/reviews/{review_id}/confirm", "/api/reviews/{review_id}/reject",
              "/api/approvals", "/api/approvals/{approval_id}/approve",
              "/api/approvals/{approval_id}/reject", "/api/approvals/{approval_id}/payload",
              "/api/dashboard/priorities", "/api/dashboard/summary",
              "/api/trainees/{trainee_id}/timeline", "/api/command"]:
        assert p in spec["paths"], p


def test_error_shape_is_contract(client):
    r = client.get("/api/sessions/999/attendance")
    assert r.status_code == 404
    assert r.json() == {"error": {"code": "NOT_FOUND", "message": "الجلسة مش موجودة"}}


def test_full_flow_through_api(client, db, seeded):
    sid = seeded["session"].id
    r = client.post(f"/api/sessions/{sid}/close")
    assert r.status_code == 202
    assert r.json()["run_id"]
    assert client.get(f"/api/sessions/{sid}/run").json()["run"]["pause_reason"] == "needs_review"

    # double start is refused
    assert client.post(f"/api/sessions/{sid}/close").status_code == 409

    pend = client.get("/api/reviews/pending").json()
    assert len(pend["reviews"]) == 3
    assert pend["sessions"][0]["stats"]["needs_review"] == 3
    roster = {t["name_ar"]: t["trainee_id"] for t in pend["sessions"][0]["roster"]}
    mapping = {"احمد م.": "أحمد محمود حسن", "Ahmed Mostafa": "أحمد مصطفى", "محمد علي": "محمد علي"}
    for rv in pend["reviews"]:
        assert rv["suggestions"] and "name_ar" in rv["suggestions"][0]
        out = client.post(f"/api/reviews/{rv['review_id']}/confirm",
                          json={"trainee_id": roster[mapping[rv["zoom_name"]]]}).json()
        assert out["ok"] and out["alias_saved"]
    assert client.get("/api/reviews/pending").json()["reviews"] == []

    # workflow resumed by the last confirm → waiting for sheet approval
    run = client.get(f"/api/sessions/{sid}/run").json()["run"]
    assert run["status"] == "awaiting_approval" and run["resume_token"] == "sheet"
    aps = client.get("/api/approvals?status=pending").json()["approvals"]
    assert len(aps) == 1 and aps[0]["type"] == "update_sheet"
    full = client.get(f"/api/approvals/{aps[0]['id']}").json()
    assert full["preview"]["rows"] and full["preview"]["counts"]

    # priorities explain themselves
    pr = client.get("/api/dashboard/priorities").json()
    assert pr["top"] and pr["top"][0]["reasoning"]

    assert FakeSheetsAdapter.writes == []
    assert client.post(f"/api/approvals/{aps[0]['id']}/approve").json()["status"] == "approved"
    assert client.post(f"/api/approvals/{aps[0]['id']}/approve").json()["status"] == "executed"
    assert len(FakeSheetsAdapter.writes) == 1            # double click → one write

    aps = client.get("/api/approvals?status=pending").json()["approvals"]
    assert aps[0]["type"] == "send_messages"
    full = client.get(f"/api/approvals/{aps[0]['id']}").json()
    assert full["preview"]["recipient_count"] == 7
    assert len(full["preview"]["messages"]) == 7           # full preview, not a sample

    # exclude one + edit one body
    msgs = full["payload"]["messages"]
    msgs[0]["excluded"] = True
    msgs[1]["body"] = "نص معدّل"
    patched = client.patch(f"/api/approvals/{aps[0]['id']}/payload",
                           json={"edited_content": {"messages": msgs}}).json()
    assert patched["status"] == "pending" and patched["preview"]["recipient_count"] == 6

    client.post(f"/api/approvals/{aps[0]['id']}/approve")
    sess = client.get(f"/api/sessions/{sid}").json()
    assert sess["status"] == "closed"
    assert sess["run"]["status"] == "completed"
    assert sess["run"]["context"]["send_result"]["drafted"] == 6
    assert FakeGmailAdapter.sent == []
    assert any(d["body"] == "نص معدّل" for d in FakeGmailAdapter.drafts)

    att = client.get(f"/api/sessions/{sid}/attendance").json()
    assert len(att["records"]) == 24
    assert att["records"][0]["status"] == "absent"

    act = client.get("/api/activity?limit=100").json()["activity"]
    assert any(a["action"] == "write_attendance_sheet" and a["before"] is not None for a in act)
    tl = client.get(f"/api/trainees/{roster['آية مجدي']}/timeline").json()
    assert any(i["kind"] == "attendance" for i in tl["timeline"])
    assert any(i["kind"] == "message" for i in tl["timeline"])


def test_reject_review_excludes_row(client, db, seeded):
    sid = seeded["session"].id
    client.post(f"/api/sessions/{sid}/close")
    pend = client.get("/api/reviews/pending").json()
    rid = pend["reviews"][0]["review_id"]
    out = client.post(f"/api/reviews/{rid}/reject").json()
    assert out["ok"] and out["remaining"] == 2
    assert db.get(AttendanceRecord, rid).excluded


def test_reject_sheet_approval_continues_without_writing(client, db, seeded):
    sid = seeded["session"].id
    client.post(f"/api/sessions/{sid}/close")
    pend = client.get("/api/reviews/pending").json()
    for rv in pend["reviews"]:
        client.post(f"/api/reviews/{rv['review_id']}/reject")
    a = db.query(Approval).filter_by(status="pending").one()
    client.post(f"/api/approvals/{a.id}/reject", json={"reason": "الشيت مش جاهز"})
    assert FakeSheetsAdapter.writes == []
    run = client.get(f"/api/sessions/{sid}/run").json()["run"]
    assert run["resume_token"] == "messages"


def test_command_close_session(client, seeded):
    r = client.post("/api/command", json={"text": "اقفل سيشن React"}).json()
    assert r["intent"] == "close_session"
    assert r["action"]["type"] == "workflow" and r["action"]["run_id"]


def test_command_unknown_gives_one_clarification(client, seeded):
    r = client.post("/api/command", json={"text": "هاي"}).json()
    assert r["intent"] == "unknown" and r["clarification"]["question"]


def test_setup_endpoints(client):
    p = client.post("/api/programs", json={"name": "Flutter"}).json()
    t = client.post("/api/trainees", json={"program_id": p["id"], "name_ar": "منى سمير",
                                           "email": "mona@example.com"}).json()
    s = client.post("/api/sessions", json={"program_id": p["id"], "title": "Flutter",
                                           "planned_start": "2026-09-01T18:00:00+03:00",
                                           "planned_end": "2026-09-01T20:00:00+03:00"}).json()
    assert t["id"] and s["status"] == "scheduled"
    assert client.get(f"/api/programs/{p['id']}/trainees").json()["trainees"][0]["name_ar"] == "منى سمير"
    assert client.get("/api/sessions").json()["sessions"][0]["planned_start"] == "18:00"


def test_auth_token(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "api_token", "secret")
    assert client.get("/api/sessions").status_code == 401
    assert client.get("/api/sessions", headers={"X-API-Token": "secret"}).status_code == 200
