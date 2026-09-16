"""Phase 0: the schema holds the shapes the system depends on."""
from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.deliverable import Deliverable
from app.models.message import OutboundMessage
from app.models.person import Person
from app.models.project import Project
from app.models.task import Task
from tests.fixtures import DRIVE_FILES, TASKS, TEAM


@pytest.fixture
def team(db):
    p = Project(name="أسيوط بشبابها", drive_root_folder_id="root-folder-asyut")
    db.add(p)
    db.flush()
    people = [Person(name_ar=ar, name_en=en, role=role, email=em, drive_email=de,
                     telegram_chat_id=tg) for ar, en, role, em, de, tg in TEAM]
    db.add_all(people)
    db.flush()
    tasks = [Task(project_id=p.id, person_id=people[pi].id, title=title, kind=kind,
                  folder_path=folder, expected=expected, due_at=due)
             for title, pi, kind, folder, expected, due in TASKS]
    db.add_all(tasks)
    db.commit()
    return {"project": p, "people": people, "tasks": tasks}


def test_task_carries_its_evidence(db, team):
    t = team["tasks"][0]
    t.status = "late"
    t.evidence = "الفولدر فاضي · الميعاد عدى من يومين"
    t.last_checked_at = datetime(2026, 8, 19, 7, 0)
    db.commit()
    assert db.get(Task, t.id).evidence.startswith("الفولدر فاضي")


def test_expected_spec_round_trips_as_json(db, team):
    t = db.get(Task, team["tasks"][0].id)
    assert t.expected["min_count"] == 1
    assert t.expected["naming_pattern"] == r"^poster[-_]"


def test_person_match_emails_covers_both_addresses(db, team):
    tarek = team["people"][1]
    # Drive reports t.fouad@, the roster knows tarek@ — both must resolve to him
    assert tarek.match_emails == {"tarek@example.com", "t.fouad@example.com"}
    assert Person(name_ar="x").match_emails == set()


def test_deliverable_keeps_size_none_for_google_native(db, team):
    t = team["tasks"][0]
    db.add_all([Deliverable(task_id=t.id, drive_file_id=fid, name=name, mime_type=mime,
                            size_bytes=size, modified_at=mod, modified_by_email=by)
                for fid, name, mime, size, mod, by in DRIVE_FILES])
    db.commit()
    rows = {d.name: d for d in db.query(Deliverable).all()}
    # a Google Doc has no size — that is "unknown", never zero
    assert rows["خطة المحتوى"].size_bytes is None
    assert rows["empty.png"].size_bytes == 0


def test_deliverables_die_with_their_task(db, team):
    t = team["tasks"][0]
    db.add(Deliverable(task_id=t.id, drive_file_id="f1", name="x.png"))
    db.commit()
    db.delete(t)
    db.commit()
    assert db.query(Deliverable).count() == 0


def test_message_addresses_a_person_or_a_trainee(db, team):
    m = OutboundMessage(person_id=team["people"][0].id, task_id=team["tasks"][0].id,
                        channel="telegram", msg_type="task_followup",
                        rendered_body="فاكرة البوستر؟", idempotency_key="k1")
    db.add(m)
    db.commit()
    assert m.trainee_id is None and m.person_id is not None


def test_idempotency_key_is_unique(db, team):
    for i in range(2):
        db.add(OutboundMessage(person_id=team["people"][0].id, channel="telegram",
                               msg_type="task_followup", rendered_body=f"x{i}",
                               idempotency_key="same-key"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_tenant_id_defaults_on_root_tables(db, team):
    assert db.get(Project, team["project"].id).tenant_id == 1
    assert db.get(Task, team["tasks"][0].id).tenant_id == 1
    assert db.get(Person, team["people"][0].id).tenant_id == 1
