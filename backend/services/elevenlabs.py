from elevenlabs.client import AsyncElevenLabs
from core.config import get_settings
from core.logging import get_logger

logger = get_logger(__name__)

_elevenlabs_client: AsyncElevenLabs | None = None


def load_elevenlabs() -> None:
    """
    Initializes ElevenLabs async client singleton.
    Called once at application startup in main.py lifespan.

    Follows the same singleton pattern as load_whisper() and compile_graph()
    so all external API clients are initialized at startup, not per-request.
    """
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