import uuid
from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import JSONType

RUN_STATUSES = ("running", "paused", "awaiting_approval", "completed", "failed", "cancelled")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True,
                                    default=lambda: uuid.uuid4().hex)
    tenant_id: Mapped[int] = mapped_column(default=1, index=True)
    definition: Mapped[str] = mapped_column(String(50), index=True)

    status: Mapped[str] = mapped_column(String(30), default="running", index=True)
    current_step: Mapped[str | None] = mapped_column(String(50))

    # the whole state — a run must resume hours later from the DB alone
    context: Mapped[dict] = mapped_column(JSONType, default=dict)
    pause_reason: Mapped[str | None] = mapped_column(String(100))
    resume_token: Mapped[str | None] = mapped_column(String(100))

    # denormalised for cheap lookups ("the run for session 412")
    session_id: Mapped[int | None] = mapped_column(index=True)

    completed_steps: Mapped[list] = mapped_column(JSONType, default=list)
    error: Mapped[str | None] = mapped_column(String(1000))
    retry_count: Mapped[int] = mapped_column(default=0)
    # human-readable transitions for the UI's live workflow view
    events: Mapped[list] = mapped_column(JSONType, default=list)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
