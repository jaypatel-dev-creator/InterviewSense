import asyncio
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from core.logging import get_logger
from audio.transcriber import transcribe
from audio.analyzer import extract_speech_features

logger = get_logger(__name__)

# Shared thread pool for CPU-bound audio tasks
_executor = ThreadPoolExecutor(max_workers=2)


async def process_audio_chunk(
    audio_chunk: np.ndarray,
    sample_rate: int = 16000,
) -> dict:
    """
    Runs Whisper transcription and librosa analysis in parallel
    on the same audio chunk using ThreadPoolExecutor.

    Returns combined result:
        {
            "transcript": dict,     # from transcriber
            "speech_metrics": dict, # from analyzer
        }
    """
    loop = asyncio.get_event_loop()

    logger.debug("Starting parallel audio processing — Whisper + librosa")

    # Both run concurrently on the same chunk
    transcription_future = loop.run_in_executor(
        _executor,
        transcribe,
        audio_chunk,
        sample_rate,
    )

    analysis_future = loop.run_in_executor(
        _executor,
        _run_analysis,
        audio_chunk,
        sample_rate,
    )

    transcript, speech_metrics = await asyncio.gather(
        transcription_future,
        analysis_future,
    )

    # Recompute word-derived metrics now that we have word timestamps
    word_metrics = extract_speech_features(
        audio=audio_chunk,
        sample_rate=sample_rate,
        words=transcript.get("words", []),
    )

    # Merge — word-derived metrics override librosa-only estimates
    merged_metrics = {**speech_metrics, **word_metrics}

    logger.debug("Parallel audio processing complete.")

    return {
        "transcript": transcript,
        "speech_metrics": merged_metrics,
    }


def _run_analysis(audio_chunk: np.ndarray, sample_rate: int) -> dict:
    """
    Runs librosa analysis without word timestamps.
    Word-derived metrics (WPM, pauses, fillers) added after
    Whisper finishes and timestamps are available.
    """
    return extract_speech_features(
        audio=audio_chunk,
        sample_rate=sample_rate,
        words=None,
    )
