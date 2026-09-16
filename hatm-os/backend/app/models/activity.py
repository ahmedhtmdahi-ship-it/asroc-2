from datetime import datetime

from sqlalchemy import Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import JSONType


class ActivityLog(Base):
    __tablename__ = "activity_log"
    __table_args__ = (Index("ix_activity_ts", "timestamp"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(default=1, index=True)

    actor_type: Mapped[str] = mapped_column(String(20))       # human | system | workflow
    actor_id: Mapped[str | None] = mapped_column(String(100))

    action: Mapped[str] = mapped_column(String(100), index=True)
    target_type: Mapped[str | None] = mapped_column(String(50))
    target_id: Mapped[str | None] = mapped_column(String(50))

    before: Mapped[dict | None] = mapped_column(JSONType)
    after: Mapped[dict | None] = mapped_column(JSONType)

    result: Mapped[str] = mapped_column(String(20))           # success | failure
    error: Mapped[str | None] = mapped_column(String(1000))
    duration_ms: Mapped[int | None] = mapped_column(Integer)

    workflow_run_id: Mapped[str | None] = mapped_column(String(40), index=True)
    timestamp: Mapped[datetime] = mapped_column(server_default=func.now())
