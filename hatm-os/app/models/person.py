from datetime import datetime

from sqlalchemy import Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Person(Base):
    """A member of the team (8 people), not a trainee."""

    __tablename__ = "people"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(Integer, default=1, index=True)

    name_ar: Mapped[str] = mapped_column(String(200))
    name_en: Mapped[str | None] = mapped_column(String(200))
    role: Mapped[str | None] = mapped_column(String(100))

    email: Mapped[str | None] = mapped_column(String(200), index=True)
    # ⭐ the address Drive reports in lastModifyingUser.emailAddress — the link
    # between a file and the person who uploaded it. May differ from `email`.
    drive_email: Mapped[str | None] = mapped_column(String(200), index=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(50), index=True)
    phone: Mapped[str | None] = mapped_column(String(30))

    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    tasks: Mapped[list["Task"]] = relationship(back_populates="person")  # noqa: F821

    @property
    def match_emails(self) -> set[str]:
        """Every address that identifies this person on a Drive file."""
        return {e.strip().lower() for e in (self.drive_email, self.email) if e and e.strip()}
