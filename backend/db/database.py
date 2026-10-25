from pathlib import Path
from contextlib import asynccontextmanager

from sqlalchemy import event
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


def _get_session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() on startup.")
    return _session_factory


async def init_db() -> None:
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

    # SQLite ignores foreign keys unless this pragma is set on every connection.
    @event.listens_for(_engine.sync_engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

   
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info(f"Database initialized — path: {db_path}")


@asynccontextmanager
async def get_db():
    factory = _get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise