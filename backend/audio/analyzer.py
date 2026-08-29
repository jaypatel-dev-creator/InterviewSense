import numpy as np
from core.logging import get_logger

logger = get_logger(__name__)

FILLER_WORDS = {
    # Hesitation sounds
    "um", "uh", "umm", "uhh", "er", "err", "hmm",
    # Discourse fillers — extremely common in interview speech
    "so", "right", "okay", "ok", "well", "now",
    # Hedges and padding
    "like", "basically", "literally", "actually", "honestly",
    "essentially", "technically", "generally", "obviously",
    # Two-word fillers
    "you know", "sort of", "kind of", "i mean", "i guess",
    "you see", "as i", "so yeah",
}


def extract_speech_features(
    words: list[dict] | None = None,
    duration: float = 0.0,
) -> dict:
    """
    Extracts speech features purely from Whisper word timestamps.

    librosa removed — energy_level (RMS) and pitch_variation (F0 std dev)
    were basic signal processing metrics, not actionable for interview feedback,
    and pulled torch, numba, llvmlite as transitive dependencies.

    All metrics are now derived entirely from Whisper word-level timestamps.

    Args:
        words:    word-level timestamps from Whisper (optional)
        duration: audio duration in seconds

    Returns dict with all speech metrics.
    """
    wpm = _compute_wpm(words, duration) if words else 0.0
    pause_count = _compute_pause_count(words) if words else 0
    filler_count = _compute_filler_count(words) if words else 0

    metrics = {
        "wpm": round(wpm, 2),
        "pause_count": pause_count,
        "filler_word_count": filler_count,
        "answer_duration_seconds": round(duration, 2),
    }

    logger.debug(f"Speech features extracted: {metrics}")
    return metrics


def _compute_wpm(words: list[dict], duration: float) -> float:
    if not words or duration <= 0:
        return 0.0
    minutes = duration / 60
    return len(words) / minutes if minutes > 0 else 0.0


def _compute_pause_count(words: list[dict], pause_threshold: float = 1.5) -> int:
    """Counts pauses longer than pause_threshold seconds between words."""
    if len(words) < 2:
        return 0
    count = 0
    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        if gap > pause_threshold:
            count += 1
    return count


def _compute_filler_count(words: list[dict]) -> int:
    count = 0
    word_list = [w["word"].lower().strip(".,!?") for w in words]
    for i, word in enumerate(word_list):
        if word in FILLER_WORDS:
            count += 1
        # Check two-word fillers
        if i < len(word_list) - 1:
            bigram = f"{word} {word_list[i + 1]}"
            if bigram in FILLER_WORDS:
                count += 1
    return count