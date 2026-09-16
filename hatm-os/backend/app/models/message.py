from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import JSONType

MESSAGE_STATUSES = ("draft", "pending_approval", "approved", "sent", "failed",
                    "skipped", "excluded")


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(default=1, index=True)
    type: Mapped[str] = mapped_column(String(50), index=True)   # absence | partial | feedback
    lang: Mapped[str] = mapped_column(String(5), default="ar")
    subject: Mapped[str | None] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)
    variables: Mapped[list] = mapped_column(JSONType, default=list)
    active: Mapped[bool] = mapped_column(default=True)


class OutboundMessage(Base):
    __tablename__ = "outbound_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    trainee_id: Mapped[int] = mapped_column(ForeignKey("trainees.id"), index=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("sessions.id"))
    approval_id: Mapped[int | None] = mapped_column(ForeignKey("approvals.id"), index=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("message_templates.id"))

    channel: Mapped[str] = mapped_column(String(20), default="email")
    msg_type: Mapped[str] = mapped_column(String(50))            # absence | partial | feedback | reminder
    to_address: Mapped[str | None] = mapped_column(String(200))

    rendered_subject: Mapped[str | None] = mapped_column(String(300))
    rendered_body: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)

    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True)
    provider_id: Mapped[str | None] = mapped_column(String(200))
    error: Mapped[str | None] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(index=True)
    replied_at: Mapped[datetime | None]
