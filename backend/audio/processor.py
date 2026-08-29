import asyncio
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from core.logging import get_logger
from audio.transcriber import transcribe
from audio.analyzer import extract_speech_features

logger = get_logger(__name__)

# Thread pool for Whisper transcription (CPU-bound, runs in Groq API call)
_executor = ThreadPoolExecutor(max_workers=2)


async def process_audio_chunk(
    audio_chunk: np.ndarray,
    sample_rate: int = 16000,
) -> dict:
    """
    Transcribes audio via Groq Whisper, then computes all speech metrics
    from the returned word timestamps.

    Architecture:
        - Whisper transcription runs in a thread pool (blocking Groq API call).
        - Once word timestamps are available, extract_speech_features() computes
          all metrics (WPM, pause count, filler count, duration) — pure math,
          no model, no signal processing.
        - librosa removed: energy_level and pitch_variation were basic signal
          processing metrics not actionable for interview feedback, and pulled
          torch, numba, llvmlite as transitive dependencies.

    Returns:
        {
            "transcript": dict,     # from transcriber
            "speech_metrics": dict, # from analyzer
        }
    """
    loop = asyncio.get_event_loop()

    logger.debug("Starting Whisper transcription.")

    transcript = await loop.run_in_executor(
        _executor,
        transcribe,
        audio_chunk,
        sample_rate,
    )

    words = transcript.get("words", [])
    duration = len(audio_chunk) / sample_rate
    speech_metrics = extract_speech_features(words=words, duration=duration)

    logger.debug("Audio processing complete.")

    return {
        "transcript": transcript,
        "speech_metrics": speech_metrics,
    }