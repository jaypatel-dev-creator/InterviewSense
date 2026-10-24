import numpy as np
from core.logging import get_logger

logger = get_logger(__name__)

FILLER_WORDS = {
    # Hesitation sounds
    "um", "uh", "umm", "uhh", "er", "err", "hmm",
    # Two-word fillers
    "you know", "i mean",
}


def extract_speech_features(
    words: list[dict] | None = None,
    duration: float = 0.0,
) -> dict:
   
    speaking_duration = _compute_speaking_duration(words, duration) if words else duration
    wpm = _compute_wpm(words, speaking_duration) if words else 0.0
    pause_count = _compute_pause_count(words) if words else 0
    filler_count = _compute_filler_count(words) if words else 0

    metrics = {
        "wpm": round(wpm, 2),
        "pause_count": pause_count,
        "filler_word_count": filler_count,
        "answer_duration_seconds": round(speaking_duration, 2),
    }

    logger.debug(f"Speech features extracted: {metrics}")
    return metrics


def _compute_speaking_duration(words: list[dict], clip_duration: float) -> float:
    """
    Time from the first word's start to the last word's end. Excludes the
    lead-in silence before speech and the trailing silence the recorder waits
    for before sending. Falls back to the clip length when the spoken span is
    too short to give a reliable rate (under 1 second).
    """
    span = words[-1]["end"] - words[0]["start"]
    return span if span >= 1.0 else clip_duration


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
    i = 0
    while i < len(word_list):
        # Check two-word fillers first; consume both words so neither is counted again
        if i < len(word_list) - 1 and f"{word_list[i]} {word_list[i + 1]}" in FILLER_WORDS:
            count += 1
            i += 2
            continue
        if word_list[i] in FILLER_WORDS:
            count += 1
        i += 1
    return count