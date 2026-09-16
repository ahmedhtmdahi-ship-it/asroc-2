"""Max N sent messages per trainee per window. ONE function — every send calls it."""
from datetime import timedelta

from sqlalchemy import func

from app.config import settings
from app.core.timeutil import utcnow
from app.db import SessionLocal
from app.models.message import OutboundMessage


class AntiSpamGate:
    @staticmethod
    def check(trainee_id: int | None = None, db=None, *,
              person_id: int | None = None) -> tuple[bool, str | None]:
        """One window per recipient, whichever kind they are."""
        if (trainee_id is None) == (person_id is None):
            raise ValueError("pass exactly one of trainee_id / person_id")
        own = db is None
        db = db or SessionLocal()
        try:
            since = utcnow() - timedelta(hours=settings.antispam_window_hours)
            who = (OutboundMessage.person_id == person_id if person_id is not None
                   else OutboundMessage.trainee_id == trainee_id)
            n = db.query(func.count(OutboundMessage.id)).filter(
                who,
                OutboundMessage.sent_at >= since,
                OutboundMessage.status == "sent",
            ).scalar() or 0
            if n >= settings.antispam_max_messages:
                return False, (f"اتبعتله {n} رسالة في آخر "
                               f"{settings.antispam_window_hours} ساعة")
            return True, None
        finally:
            if own:
                db.close()

    @classmethod
    def filter_batch(cls, trainee_ids: list[int] | None = None, *,
                     person_ids: list[int] | None = None) -> tuple[list[int], list[dict]]:
        allowed: list[int] = []
        blocked: list[dict] = []
        key = "person_id" if person_ids is not None else "trainee_id"
        for rid in (person_ids if person_ids is not None else (trainee_ids or [])):
            ok, reason = cls.check(**{key: rid})
            if ok:
                allowed.append(rid)
            else:
                blocked.append({key: rid, "reason": reason})
        return allowed, blocked
