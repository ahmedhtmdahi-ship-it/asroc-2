from datetime import date, datetime

from sqlalchemy import Date, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import JSONType


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    name: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[date | None] = mapped_column(Date)
    drive_folder_id: Mapped[str | None] = mapped_column(String(100))

    # attendance rules live as data, not code (see domain/rules.py DEFAULT_RULES)
    attendance_rules: Mapped[dict] = mapped_column(JSONType, default=dict)

    attendance_sheet_id: Mapped[str | None] = mapped_column(String(100))
    attendance_sheet_tab: Mapped[str | None] = mapped_column(String(100))
    feedback_form_url: Mapped[str | None] = mapped_column(String(500))

    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    sessions: Mapped[list["Session"]] = relationship(back_populates="program")  # noqa: F821
    trainees: Mapped[list["Trainee"]] = relationship(back_populates="program")  # noqa: F821
