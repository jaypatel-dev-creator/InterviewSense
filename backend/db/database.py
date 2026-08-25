from pathlib import Path
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)

from core.config import get_settings
from core.logging import get_logger
from db.models import Base

logger = get_logger(__name__)

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _get_engine() -> AsyncEngine:
    if _engine is None:
        raise RuntimeError("Database not initialized. Call init_db() on startup.")
    return _engine


def _get_session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() on startup.")
    return _session_factory


async def init_db() -> None:
    """
    Initializes the async SQLAlchemy engine, session factory, and creates
    all tables via Base.metadata.create_all. Called once at application startup.

    Uses sqlite+aiosqlite as the async driver — aiosqlite stays in requirements,
    SQLAlchemy uses it under the hood via the connection URL.

    Switching to Postgres for deployment: change the URL to
    postgresql+asyncpg://... and update requirements. models.py and queries.py
    don't change at all.
    """
    global _engine, _session_factory

    settings = get_settings()
    db_path = settings.sqlite_db_path

    # Ensure parent directory exists
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    _engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_path}",
        echo=False,           # set True temporarily to debug SQL queries
        future=True,
    )

    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        # expire_on_commit=False — ORM objects stay accessible after commit
        # without needing an active session. Required here because queries.py
        # returns plain dicts converted from ORM objects after session closes.
    )

    # Create all tables defined in models.py — equivalent to Alembic's
    # initial migration but without the migration history overhead.
    # Safe to call on every startup — CREATE TABLE IF NOT EXISTS semantics.
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info(f"Database initialized — path: {db_path}")


@asynccontextmanager
async def get_db():
    """
    Async context manager yielding an AsyncSession.

    Usage (identical to old aiosqlite pattern — callers don't change):
        async with await get_db() as db:
            await some_query(db, ...)

    The session commits automatically on clean exit and rolls back on exception.
    """
    factory = _get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise