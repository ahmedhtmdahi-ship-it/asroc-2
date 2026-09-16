from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_match_contract(roster):
    r = client.post("/match", json={"session_id": 1, "roster": roster, "candidates": [
        {"idx": 0, "name": "احمد م.", "email": None, "user_id": None},
        {"idx": 1, "name": "Mohamed Ali", "email": "m.ali@example.com", "user_id": "abc"}]})
    assert r.status_code == 200
    body = r.json()
    assert body["matches"][0]["method"] == "alias"
    assert body["matches"][1]["method"] == "email"
    assert body["stats"]["auto_matched"] == 2


def test_parse_and_prioritize():
    r = client.post("/parse", json={"text": "ملخص", "context": {}})
    assert r.json()["intent"] == "daily_brief"
    r = client.post("/prioritize", json={"items": [
        {"id": "a", "title": "x", "kind": "info"},
        {"id": "b", "title": "y", "kind": "decision", "affected": 20, "blocking": True}]})
    assert r.json()["top_3"][0]["id"] == "b" and r.json()["reasoning"]


def test_learn_echoes_normalised():
    r = client.post("/learn", json={"trainee_id": 1, "confirmed_alias": "احمد م.", "session_id": 4})
    assert r.json()["normalized"] == "احمد م"
