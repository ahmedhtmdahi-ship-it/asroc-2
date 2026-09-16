from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def _make_engine(url: str):
    kwargs: dict = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        from sqlalchemy.pool import StaticPool

        kwargs = {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
    return create_engine(url, **kwargs)


engine = _make_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def rebind(url: str) -> None:
    """Point the global session factory at another database (used by tests)."""
    global engine
    engine = _make_engine(url)
    SessionLocal.configure(bind=engine)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
