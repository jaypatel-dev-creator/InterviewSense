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

    Architecture:
        - Whisper (transcription) and librosa (signal analysis) run concurrently.
        - After both finish, word-level metrics (WPM, pauses, fillers) are
          computed from Whisper's word timestamps and merged into the librosa
          metrics dict — selectively, not via a full re-run of extract_speech_features.
        - This avoids the previous pattern where a second extract_speech_features
          call (with words) recomputed ALL keys including energy/pitch/silence,
          making the parallel librosa run 100% wasted work.

    Returns combined result:
        {
            "transcript": dict,     # from transcriber
            "speech_metrics": dict, # from analyzer
        }
    """
    loop = asyncio.get_event_loop()

    logger.debug("Starting parallel audio processing — Whisper + librosa")

    # Whisper transcription and librosa signal analysis run concurrently
    transcription_future = loop.run_in_executor(
        _executor,
        transcribe,
        audio_chunk,
        sample_rate,
    )

    analysis_future = loop.run_in_executor(
        _executor,
        _run_signal_analysis,
        audio_chunk,
        sample_rate,
    )

    transcript, speech_metrics = await asyncio.gather(
        transcription_future,
        analysis_future,
    )

    # Now that Whisper word timestamps are available, compute word-derived
    # metrics (WPM, pause count, filler count) and merge them in selectively.
    # These three keys are the only ones that require word timestamps —
    # energy, pitch, silence_ratio are already correct from the parallel run.
    words = transcript.get("words", [])
    word_metrics = _compute_word_metrics(words, audio_chunk, sample_rate)
    speech_metrics.update(word_metrics)

    logger.debug("Parallel audio processing complete.")

    return {
        "transcript": transcript,
        "speech_metrics": speech_metrics,
    }


def _run_signal_analysis(audio_chunk: np.ndarray, sample_rate: int) -> dict:
    """
    Runs librosa signal analysis only — no word timestamps needed.
    Computes: energy_level, pitch_variation, silence_ratio, answer_duration_seconds.
    Word-derived metrics (wpm, pause_count, filler_word_count) are added
    after Whisper finishes via _compute_word_metrics.
    """
    return extract_speech_features(
        audio=audio_chunk,
        sample_rate=sample_rate,
        words=None,
    )


def _compute_word_metrics(
    words: list[dict],
    audio_chunk: np.ndarray,
    sample_rate: int,
) -> dict:
    """
    Extracts only the three word-timestamp-dependent metrics.
    Called after Whisper returns so timestamps are available.
    Avoids re-running the full librosa pipeline a second time.
    """
    from audio.analyzer import _compute_wpm, _compute_pause_count, _compute_filler_count

    duration = len(audio_chunk) / sample_rate

    return {
        "wpm": round(_compute_wpm(words, duration), 2),
        "pause_count": _compute_pause_count(words),
        "filler_word_count": _compute_filler_count(words),
    }