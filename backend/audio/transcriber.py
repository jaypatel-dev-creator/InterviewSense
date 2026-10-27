import io
import numpy as np
import soundfile as sf
from groq import AsyncGroq
from core.config import get_settings
from core.logging import get_logger
from core.exceptions import TranscriptionException

logger = get_logger(__name__)

GROQ_MODEL = "whisper-large-v3-turbo"

WHISPER_PROMPT = "Umm, let me think like, hmm... Okay, so, uh, here's what I'm, you know, thinking."

# Module-level singleton — initialized once at startup
_groq_client: AsyncGroq | None = None


def load_whisper() -> None:
    global _groq_client
    settings = get_settings()
    _groq_client = AsyncGroq(api_key=settings.groq_api_key)
    logger.info(f"Groq STT client initialized — model: {GROQ_MODEL}")


def get_groq_client() -> AsyncGroq:
    if _groq_client is None:
        raise RuntimeError("Groq client not initialized. Call load_whisper() on startup.")
    return _groq_client


def _numpy_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    audio_int16 = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
    sf.write(buffer, audio_int16, sample_rate, format="WAV", subtype="PCM_16")
    buffer.seek(0)
    return buffer.read()


async def transcribe(audio_chunk: np.ndarray, sample_rate: int = 16000) -> dict:
    client = get_groq_client()

    wav_bytes = _numpy_to_wav_bytes(audio_chunk, sample_rate)

    try:
        response = await client.audio.transcriptions.create(
            file=("audio.wav", wav_bytes, "audio/wav"),
            model=GROQ_MODEL,
            language="en",
            prompt=WHISPER_PROMPT,
            response_format="verbose_json",
            timestamp_granularities=["word"],
        )
    except Exception as e:
        logger.error(f"Groq transcription failed: {e}")
        raise TranscriptionException(f"Groq STT failed: {str(e)}")

    full_text = response.text.strip() if response.text else ""

    words = []
    if hasattr(response, "words") and response.words:
        for w in response.words:
            # Groq verbose_json returns words as plain dicts, not objects
            if isinstance(w, dict):
                words.append({
                    "word": w["word"].strip(),
                    "start": w["start"],
                    "end": w["end"],
                    "probability": 1.0,
                })
            else:
                words.append({
                    "word": w.word.strip(),
                    "start": w.start,
                    "end": w.end,
                    "probability": 1.0,
                })

    language = response.language if hasattr(response, "language") else "en"

    logger.debug(f"Transcribed {len(words)} words via Groq — language: {language}")

    return {
        "text": full_text,
        "words": words,
        "language": language,
    }