"""SQLite schema and connection.

    python -m app.db        # creates the file and the four tables (safe to re-run)

Why plain sqlite3 and no ORM: there are four tables and one writer. An ORM here
would be more code to maintain than the SQL it hides.

Two storage conventions, because SQLite has neither type:

* **Times are TEXT, ISO-8601, UTC** — `2026-08-17T14:40:00Z`. Fixed-width ISO
  sorts and compares correctly as a string, so `WHERE due_at < ?` just works.
  UTC because Drive reports `modifiedTime` in UTC; if we stored local time we
  would be comparing two different clocks when deciding "uploaded after the
  deadline". The Cairo conversion happens at display time only (config.TZ).
* **`expected` is TEXT holding JSON** — `{"min_count": 30}`. Use
  `json.loads(row["expected"])` when reading.
"""
import json
import sqlite3
from pathlib import Path

from app import config

# The spec's vocabulary, enforced by the database so a typo fails loudly
# instead of silently creating a status nothing handles.
TASK_KINDS = ("file", "confirm")
TASK_STATUSES = ("pending", "ok", "late", "bad_file", "needs_fix", "unverifiable")
MESSAGE_STATUSES = ("draft", "copied", "dismissed")


def _in(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{v}'" for v in values)


SCHEMA = f"""
CREATE TABLE IF NOT EXISTS person (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    -- the address Drive reports in lastModifyingUser.emailAddress; this is how
    -- a file is attributed to a person, so it must match Drive exactly
    drive_email TEXT,
    -- international, no '+' and no spaces: 201012345678 (goes straight into wa.me)
    phone       TEXT
);

CREATE TABLE IF NOT EXISTS task (
    id              INTEGER PRIMARY KEY,
    person_id       INTEGER REFERENCES person(id),
    title           TEXT NOT NULL,
    project         TEXT,
    folder_path     TEXT,
    drive_folder_id TEXT,

    -- file    = has a deliverable we can check
    -- confirm = no artefact; the system must ask instead of guessing
    kind            TEXT NOT NULL DEFAULT 'file'
                    CHECK (kind IN ({_in(TASK_KINDS)})),

    -- JSON: {{"min_count": 30, "naming_pattern": "...", "min_kb": 50}}
    expected        TEXT NOT NULL DEFAULT '{{}}',

    due_at          TEXT,
    -- the sheet line this task came from; one sheet, so it identifies the task
    sheet_row       INTEGER UNIQUE,

    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ({_in(TASK_STATUSES)})),

    -- ⭐ the checkable Arabic sentence behind the status. No evidence, no status.
    evidence        TEXT,
    last_checked_at TEXT
);

CREATE TABLE IF NOT EXISTS deliverable (
    id                INTEGER PRIMARY KEY,
    task_id           INTEGER NOT NULL REFERENCES task(id) ON DELETE CASCADE,
    drive_file_id     TEXT NOT NULL,
    name              TEXT NOT NULL,

    -- NULL means "Drive did not report a size" (native Docs/Sheets/Slides).
    -- It is NOT zero. A real empty upload is 0 — and that is a bad_file.
    size_bytes        INTEGER,

    modified_at       TEXT,
    modified_by_email TEXT,

    -- a re-scan sees the same file again; update it, don't duplicate it
    UNIQUE (task_id, drive_file_id)
);

CREATE TABLE IF NOT EXISTS message (
    id         INTEGER PRIMARY KEY,
    task_id    INTEGER REFERENCES task(id) ON DELETE CASCADE,
    person_id  INTEGER REFERENCES person(id),
    body       TEXT NOT NULL,
    wame_link  TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ({_in(MESSAGE_STATUSES)})),
    created_at TEXT NOT NULL
               DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS ix_task_person      ON task(person_id);
CREATE INDEX IF NOT EXISTS ix_task_status      ON task(status);
CREATE INDEX IF NOT EXISTS ix_deliverable_task ON deliverable(task_id);
CREATE INDEX IF NOT EXISTS ix_message_status   ON message(status);
"""


def connect(path: Path | str | None = None) -> sqlite3.Connection:
    """Open the database with the settings this project assumes everywhere."""
    conn = sqlite3.connect(path or config.DB_PATH)
    # rows read like dicts: row["title"] instead of row[3]
    conn.row_factory = sqlite3.Row
    # SQLite ignores foreign keys unless asked, per connection — without this the
    # ON DELETE CASCADE above silently does nothing
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(path: Path | str | None = None) -> Path:
    """Create the file and the tables. Safe to run again."""
    target = Path(path or config.DB_PATH)
    target.parent.mkdir(parents=True, exist_ok=True)
    with connect(target) as conn:
        conn.executescript(SCHEMA)
    return target


def dumps(value: dict) -> str:
    """For `expected` — ensure_ascii=False keeps Arabic readable in the file."""
    return json.dumps(value, ensure_ascii=False)


def loads(value: str | None) -> dict:
    return json.loads(value) if value else {}


def main() -> None:
    target = init_db()
    with connect(target) as conn:
        tables = [r["name"] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        counts = {t: conn.execute(f"SELECT count(*) AS n FROM {t}").fetchone()["n"]
                  for t in tables}
    print(f"قاعدة البيانات: {target}")
    for t, n in counts.items():
        print(f"  {t:<12} {n} صف")


if __name__ == "__main__":
    main()
