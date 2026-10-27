from elevenlabs.client import AsyncElevenLabs
from core.config import get_settings
from core.logging import get_logger

logger = get_logger(__name__)

_elevenlabs_client: AsyncElevenLabs | None = None


def load_elevenlabs() -> None:
    global _elevenlabs_client
    settings = get_settings()
    _elevenlabs_client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)
    logger.info("ElevenLabs client initialized.")


def get_elevenlabs_client() -> AsyncElevenLabs:
    if _elevenlabs_client is None:
        raise RuntimeError(
            "ElevenLabs client not initialized. Call load_elevenlabs() on startup."
        )
    return _elevenlabs_client