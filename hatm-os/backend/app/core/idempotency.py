"""Deterministic keys so retries, double-clicks and replays collapse to one effect."""
import hashlib
import json
from typing import Any


def make_key(*parts: Any) -> str:
    raw = "|".join(json.dumps(p, sort_keys=True, ensure_ascii=False, default=str)
                   for p in parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:40]


def approval_key(type_: str, payload: dict) -> str:
    return make_key("approval", type_, payload)


def message_key(trainee_id: int, msg_type: str, session_id: int | None,
                channel: str = "email", variant: str | None = None) -> str:
    return make_key("msg", trainee_id, msg_type, session_id, channel, variant)
