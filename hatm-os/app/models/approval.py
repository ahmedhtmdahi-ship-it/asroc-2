from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import JSONType

APPROVAL_STATUSES = ("pending", "approved", "rejected", "expired", "executed")


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(default=1, index=True)

    # update_sheet | send_messages | ...
    type: Mapped[str] = mapped_column(String(50), index=True)
    payload: Mapped[dict] = mapped_column(JSONType)   # what execution needs
    preview: Mapped[dict] = mapped_column(JSONType)   # what the human sees

    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)

    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True)
    workflow_run_id: Mapped[str | None] = mapped_column(String(40), index=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    expires_at: Mapped[datetime]
    decided_by: Mapped[str | None] = mapped_column(String(100))
    decided_at: Mapped[datetime | None]
    executed_at: Mapped[datetime | None]
    reject_reason: Mapped[str | None] = mapped_column(String(500))

    def is_actionable(self, now: datetime) -> bool:
        return self.status == "pending" and self.expires_at > now
