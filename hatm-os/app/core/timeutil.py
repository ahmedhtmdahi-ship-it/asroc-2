"""All timestamps are stored naive-UTC in the DB and displayed in Africa/Cairo."""
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.config import settings

CAIRO = ZoneInfo(settings.timezone)

AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو",
             "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
AR_DAYS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def to_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(UTC).replace(tzinfo=None)


def to_local(dt: datetime) -> datetime:
    return dt.replace(tzinfo=UTC).astimezone(CAIRO)


def fmt_date_ar(dt: datetime) -> str:
    """`17 أغسطس` — Gregorian, ASCII digits (frontend convention)."""
    loc = to_local(dt)
    return f"{loc.day} {AR_MONTHS[loc.month - 1]}"


def fmt_day_date_ar(dt: datetime) -> str:
    loc = to_local(dt)
    return f"{AR_DAYS[loc.weekday()]} {loc.day} {AR_MONTHS[loc.month - 1]}"


def fmt_time_local(dt: datetime | None) -> str | None:
    return to_local(dt).strftime("%H:%M") if dt else None
