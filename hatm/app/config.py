"""Settings, read once from .env.

Plain module-level constants instead of a Settings class: there are six of them
and they never change at runtime, so a class would only add indirection.
"""
import os
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent

load_dotenv(ROOT / ".env")


def _path(name: str, default: str) -> Path:
    """Relative values resolve against the project root, not the current directory,
    so `python -m app.db` and `uvicorn app.main:app` find the same file."""
    raw = os.getenv(name, default).strip() or default
    p = Path(raw)
    return p if p.is_absolute() else ROOT / p


DB_PATH = _path("DB_PATH", "hatm.db")

SHEET_ID = os.getenv("SHEET_ID", "").strip()
SHEET_TAB = os.getenv("SHEET_TAB", "المهام").strip()

# OAuth "Desktop app" credentials: the app runs as Hatem and sees exactly what
# he sees. A service account would need every folder shared with it by hand —
# impossible for projects he takes part in but does not own.
GOOGLE_OAUTH_CLIENT = _path("GOOGLE_OAUTH_CLIENT", "client_secret.json")
GOOGLE_TOKEN = _path("GOOGLE_TOKEN", "token.json")

# Times are stored as UTC and shown in Cairo. See app/db.py for why.
TZ = ZoneInfo("Africa/Cairo")
