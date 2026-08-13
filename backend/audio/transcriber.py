from faster_whisper import WhisperModel
from core.config import get_settings
from core.logging import get_logger
import numpy as np

logger = get_logger(__name__)

# Module-level singleton — loaded once at startup
_whisper_model: WhisperModel | None = None


def load_whisper() -> None:
    global _whisper_model
    settings = get_settings()
    _whisper_model = WhisperModel(
        model_size_or_path=settings.whisper_model_size,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
    )
    logger.info(
        f"Whisper model loaded — size: {settings.whisper_model_size}, "
        f"device: {settings.whisper_device}, compute: {settings.whisper_compute_type}"
    )


def get_whisper_model() -> WhisperModel:
    if _whisper_model is None:
        raise RuntimeError("Whisper not initialized. Call load_whisper() on startup.")
    return _whisper_model


def transcribe(audio_chunk: np.ndarray, sample_rate: int = 16000) -> dict:
    """
    Transcribes a mono float32 numpy audio array.
    Returns:
        {
            "text": str,
            "words": list[dict],   # [{word, start, end, probability}]
            "language": str,
        }
    """
    model = get_whisper_model()

    segments, info = model.transcribe(
        audio_chunk,
        language="en",
        word_timestamps=True,
        vad_filter=False,  # VAD handled upstream
    )

    full_text = ""
    words = []

    for segment in segments:
        full_text += segment.text
        if segment.words:
            for word in segment.words:
                words.append({
                    "word": word.word.strip(),
                    "start": word.start,
                    "end": word.end,
                    "probability": word.probability,
                })

    logger.debug(f"Transcribed {len(words)} words — language: {info.language}")

    return {
        "text": full_text.strip(),
        "words": words,
        "language": info.language,
    } 
