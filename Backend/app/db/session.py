"""Engine/session lifecycle with SQLite foreign-key enforcement."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.logging import get_logger
from app.core.settings import Settings
from app.db.models import Base

logger = get_logger(__name__)


def _enable_sqlite_pragmas(dbapi_connection, connection_record, settings: Settings) -> None:  # noqa: ARG001
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute(f"PRAGMA busy_timeout={int(settings.sqlite_busy_timeout_ms)}")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
    finally:
        cursor.close()


def create_engine_from_settings(settings: Settings) -> Engine:
    settings.ensure_data_dir()
    connect_args: dict[str, object] = {}
    kwargs: dict[str, object] = {"future": True, "pool_pre_ping": True}
    if settings.is_sqlite:
        connect_args["check_same_thread"] = False
        connect_args["timeout"] = settings.sqlite_busy_timeout_ms / 1000.0
        kwargs["connect_args"] = connect_args
    engine = create_engine(settings.database_url, **kwargs)
    if settings.is_sqlite:

        @event.listens_for(engine, "connect")
        def _on_connect(dbapi_connection, connection_record):  # type: ignore[no-untyped-def]
            _enable_sqlite_pragmas(dbapi_connection, connection_record, settings)

    return engine


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, class_=Session)


def init_database(engine: Engine) -> None:
    """Create missing tables.  Never drops or resets existing data."""
    Base.metadata.create_all(bind=engine)


def verify_database(engine: Engine) -> tuple[bool, str | None]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            if engine.dialect.name == "sqlite":
                result = connection.execute(text("PRAGMA foreign_keys")).scalar_one()
                if int(result) != 1:
                    return False, "sqlite_foreign_keys_disabled"
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("database readiness check failed: %s", exc.__class__.__name__)
        return False, "database_unreachable"
    return True, None


@contextmanager
def session_scope(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    """Commit-or-rollback scope.  Never held across long-running work."""
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


__all__ = [
    "create_engine_from_settings",
    "create_session_factory",
    "init_database",
    "session_scope",
    "verify_database",
]
