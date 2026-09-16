"""Max N sent messages per trainee per window. ONE function — every send calls it."""
from datetime import timedelta

from sqlalchemy import func

from app.config import settings
from app.core.timeutil import utcnow
from app.db import SessionLocal
from app.models.message import OutboundMessage


class AntiSpamGate:
    @staticmethod
    def check(trainee_id: int, db=None) -> tuple[bool, str | None]:
        own = db is None
        db = db or SessionLocal()
        try:
            since = utcnow() - timedelta(hours=settings.antispam_window_hours)
            n = db.query(func.count(OutboundMessage.id)).filter(
                OutboundMessage.trainee_id == trainee_id,
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
    def filter_batch(cls, trainee_ids: list[int]) -> tuple[list[int], list[dict]]:
        allowed: list[int] = []
        blocked: list[dict] = []
        for tid in trainee_ids:
            ok, reason = cls.check(tid)
            if ok:
                allowed.append(tid)
            else:
                blocked.append({"trainee_id": tid, "reason": reason})
        return allowed, blocked
