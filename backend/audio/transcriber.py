import io
import numpy as np
import soundfile as sf
from groq import Groq
from core.config import get_settings
from core.logging import get_logger

logger = get_logger(__name__)

GROQ_MODEL = "whisper-large-v3-turbo"

# Module-level singleton — initialized once at startup
_groq_client: Groq | None = None


def load_whisper() -> None:
    """
    Initializes Groq client singleton.
    Called load_whisper() to keep interface identical —
    swap to Deepgram here without touching any other file.
    """
    global _groq_client
    settings = get_settings()
    _groq_client = Groq(api_key=settings.groq_api_key)
    logger.info(f"Groq STT client initialized — model: {GROQ_MODEL}")


def get_groq_client() -> Groq:
    if _groq_client is None:
        raise RuntimeError("Groq client not initialized. Call load_whisper() on startup.")
    return _groq_client


def _numpy_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    """
    Converts float32 numpy array to WAV bytes for Groq API.
    Groq accepts WAV — lowest latency format per their docs.
    """
    buffer = io.BytesIO()
    sf.write(buffer, audio, sample_rate, format="WAV", subtype="FLOAT")
    buffer.seek(0)
    return buffer.read()


def transcribe(audio_chunk: np.ndarray, sample_rate: int = 16000) -> dict:
    """
    Transcribes a mono float32 numpy audio array via Groq Whisper API.

    Architecture note: implemented as chunk-based transcription.
    VAD detects silence upstream, full chunk sent here, transcript
    returns in ~1-2 seconds. Swap this file only to enable true
    word-by-word streaming via Deepgram Nova-3.

    Returns:
        {
            "text": str,
            "words": list[dict],   # [{word, start, end, probability}]
            "language": str,
        }
    """
    client = get_groq_client()

    wav_bytes = _numpy_to_wav_bytes(audio_chunk, sample_rate)

    try:
        response = client.audio.transcriptions.create(
            file=("audio.wav", wav_bytes, "audio/wav"),
            model=GROQ_MODEL,
            language="en",
            response_format="verbose_json",
            timestamp_granularities=["word"],
        )
    except Exception as e:
        logger.error(f"Groq transcription failed: {e}")
        return {"text": "", "words": [], "language": "en"}

    full_text = response.text.strip() if response.text else ""

    words = []
    if hasattr(response, "words") and response.words:
        for w in response.words:
            words.append({
                "word": w.word.strip(),
                "start": w.start,
                "end": w.end,
                "probability": 1.0,  # Groq verbose_json doesn't expose per-word probability
            })

    language = response.language if hasattr(response, "language") else "en"

    logger.debug(f"Transcribed {len(words)} words via Groq — language: {language}")

    return {
        "text": full_text,
        "words": words,
        "language": language,
    }