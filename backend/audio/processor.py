import numpy as np
from core.logging import get_logger
from audio.transcriber import transcribe
from audio.analyzer import extract_speech_features

logger = get_logger(__name__)


async def process_audio_chunk(
    audio_chunk: np.ndarray,
    sample_rate: int = 16000,
) -> dict:

    logger.debug("Starting Whisper transcription.")

    transcript = await transcribe(audio_chunk, sample_rate)

    words = transcript.get("words", [])
    duration = len(audio_chunk) / sample_rate
    speech_metrics = extract_speech_features(words=words, duration=duration)

    logger.debug("Audio processing complete.")

    return {
        "transcript": transcript,
        "speech_metrics": speech_metrics,
    }