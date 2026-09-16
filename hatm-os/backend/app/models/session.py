from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

SESSION_STATUSES = ("scheduled", "running", "needs_review", "awaiting_approval",
                    "closed", "failed")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(default=1, index=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))

    zoom_meeting_id: Mapped[str | None] = mapped_column(String(50))
    zoom_meeting_uuid: Mapped[str | None] = mapped_column(String(100))

    planned_start: Mapped[datetime]
    planned_end: Mapped[datetime]
    actual_start: Mapped[datetime | None]
    actual_end: Mapped[datetime | None]

    status: Mapped[str] = mapped_column(String(30), default="scheduled", index=True)
    closed_at: Mapped[datetime | None]

    program = relationship("Program", back_populates="sessions")

    @property
    def planned_minutes(self) -> float:
        return (self.planned_end - self.planned_start).total_seconds() / 60
