from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import JSONType


class Trainee(Base):
    __tablename__ = "trainees"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(default=1, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)

    name_ar: Mapped[str] = mapped_column(String(200))
    name_en: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(200), index=True)
    phone: Mapped[str | None] = mapped_column(String(30))

    # every manual confirmation in Review becomes an alias here
    zoom_aliases: Mapped[list] = mapped_column(JSONType, default=list)

    status: Mapped[str] = mapped_column(String(20), default="active")

    project = relationship("Project", back_populates="trainees")

    def add_alias(self, alias: str) -> bool:
        a = (alias or "").strip()
        if a and a not in (self.zoom_aliases or []):
            # JSON columns don't track in-place mutation — reassign the list
            self.zoom_aliases = list(self.zoom_aliases or []) + [a]
            return True
        return False
