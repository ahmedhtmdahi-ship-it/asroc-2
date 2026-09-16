from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import JSONType


class Deliverable(Base):
    """One file found in a task's Drive folder, as Drive reported it."""

    __tablename__ = "deliverables"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)

    drive_file_id: Mapped[str] = mapped_column(String(100), index=True)
    name: Mapped[str] = mapped_column(String(500))
    mime_type: Mapped[str | None] = mapped_column(String(200))
    # absent for native Google files (Docs/Sheets/Slides) — None ≠ 0
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)

    modified_at: Mapped[datetime | None]
    # may be missing when the service account's visibility is limited
    modified_by_email: Mapped[str | None] = mapped_column(String(200), index=True)

    is_valid: Mapped[bool] = mapped_column(default=True)
    issues: Mapped[list] = mapped_column(JSONType, default=list)

    seen_at: Mapped[datetime] = mapped_column(server_default=func.now())

    task = relationship("Task", back_populates="deliverables")
