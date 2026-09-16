from datetime import datetime

from sqlalchemy import ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import JSONType

# file    → has a deliverable in Drive the system can verify
# confirm → no artefact; the system cannot verify it and must ask
TASK_KINDS = ("file", "confirm")

TASK_STATUSES = (
    "pending",        # not due yet
    "ok",             # delivered and valid
    "late",           # due passed, nothing delivered
    "bad_file",       # delivered but broken (0 KB)
    "needs_fix",      # delivered but wrong (name, count, after the deadline)
    "unverifiable",   # kind=confirm — the system cannot check this by itself
    "cancelled",
)


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (Index("ix_tasks_status_due", "status", "due_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id"), index=True)

    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)

    kind: Mapped[str] = mapped_column(String(20), default="file")

    folder_path: Mapped[str | None] = mapped_column(String(500))
    drive_folder_id: Mapped[str | None] = mapped_column(String(100), index=True)

    # what "done" means: {type, min_count, naming_pattern, min_kb}
    expected: Mapped[dict] = mapped_column(JSONType, default=dict)

    due_at: Mapped[datetime | None] = mapped_column(index=True)
    # row this task came from, so a status write-back targets the right line
    sheet_row: Mapped[int | None] = mapped_column(Integer)

    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)

    # ⭐ not cosmetic: the checkable sentence (Arabic) behind the status.
    # Every status change writes one. No evidence → no status change.
    evidence: Mapped[str | None] = mapped_column(Text)
    issues: Mapped[list] = mapped_column(JSONType, default=list)

    last_checked_at: Mapped[datetime | None]
    closed_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    project = relationship("Project", back_populates="tasks")
    person = relationship("Person", back_populates="tasks")
    deliverables: Mapped[list["Deliverable"]] = relationship(  # noqa: F821
        back_populates="task", cascade="all, delete-orphan")
