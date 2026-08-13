import aiosqlite
from pathlib import Path
from core.config import get_settings
from core.logging import get_logger

logger = get_logger(__name__)

_db_path: str | None = None


def init_db_path() -> None:
    global _db_path
    settings = get_settings()
    _db_path = settings.sqlite_db_path
    Path(_db_path).parent.mkdir(parents=True, exist_ok=True)
    logger.info(f"Database path set to: {_db_path}")


def get_db_path() -> str:
    if _db_path is None:
        raise RuntimeError("Database not initialized. Call init_db_path() on startup.")
    return _db_path


async def get_db() -> aiosqlite.Connection:
    return aiosqlite.connect(get_db_path())