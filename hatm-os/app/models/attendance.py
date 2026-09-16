from datetime import datetime

from sqlalchemy import Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import JSONType

ATTENDANCE_STATUSES = ("present", "late", "partial", "absent", "early_leave", "needs_review")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("session_id", "trainee_id", name="uq_session_trainee"),
        Index("ix_att_session_status", "session_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), index=True)
    trainee_id: Mapped[int | None] = mapped_column(ForeignKey("trainees.id"))

    zoom_name: Mapped[str | None] = mapped_column(String(200))
    zoom_email: Mapped[str | None] = mapped_column(String(200))
    zoom_user_id: Mapped[str | None] = mapped_column(String(100))

    # raw is always kept so a rule change can be replayed
    raw_intervals: Mapped[list] = mapped_column(JSONType, default=list)
    merged_intervals: Mapped[list] = mapped_column(JSONType, default=list)

    total_minutes: Mapped[float] = mapped_column(Float, default=0)
    percentage: Mapped[float] = mapped_column(Float, default=0)
    first_join: Mapped[datetime | None]
    last_leave: Mapped[datetime | None]
    disconnect_count: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[str] = mapped_column(String(30), default="needs_review")
    flags: Mapped[list] = mapped_column(JSONType, default=list)

    match_confidence: Mapped[float] = mapped_column(Float, default=0)
    match_method: Mapped[str | None] = mapped_column(String(20))
    needs_review: Mapped[bool] = mapped_column(default=False, index=True)
    suggestions: Mapped[list] = mapped_column(JSONType, default=list)

    # rejected in Review ("not a trainee") — kept for the audit trail, excluded from stats
    excluded: Mapped[bool] = mapped_column(default=False)

    reviewed_by: Mapped[str | None] = mapped_column(String(100))
    reviewed_at: Mapped[datetime | None]
