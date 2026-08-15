import numpy as np
import librosa
from core.logging import get_logger

logger = get_logger(__name__)

FILLER_WORDS = {
    "um", "uh", "umm", "uhh", "like", "you know",
    "basically", "literally", "actually", "sort of", "kind of",
}


def extract_speech_features(
    audio: np.ndarray,
    sample_rate: int = 16000,
    words: list[dict] | None = None,
) -> dict:
    """
    Extracts paralinguistic features from raw audio + optional word timestamps.

    Args:
        audio:       mono float32 numpy array
        sample_rate: sample rate of the audio
        words:       word-level timestamps from Whisper (optional)

    Returns dict with all speech metrics.
    """
    duration = len(audio) / sample_rate

    # --- Whisper-derived features (pure math, no model) ---
    wpm = _compute_wpm(words, duration) if words else 0.0
    pause_count = _compute_pause_count(words) if words else 0
    filler_count = _compute_filler_count(words) if words else 0

    # --- librosa features (raw audio signal) ---
    pitch_variation = _compute_pitch_variation(audio, sample_rate)
    energy_level = _compute_energy_level(audio)
    silence_ratio = _compute_silence_ratio(audio, sample_rate)
    confidence_proxy = _compute_confidence_proxy(words) if words else 0.0

    metrics = {
        "wpm": round(wpm, 2),
        "pause_count": pause_count,
        "filler_word_count": filler_count,
        "answer_duration_seconds": round(duration, 2),
        "pitch_variation": round(pitch_variation, 4),
        "energy_level": round(energy_level, 4),
        "silence_ratio": round(silence_ratio, 4),
        "confidence_proxy": round(confidence_proxy, 4),
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


def _compute_pitch_variation(audio: np.ndarray, sample_rate: int) -> float:
    """
    Standard deviation of F0 via librosa.yin — proxy for vocal expressiveness.
    Replaces pyin which was probabilistic and took 20-40s on CPU for long clips.
    yin is deterministic, runs in ~50ms on the same hardware.
    """
    try:
        f0 = librosa.yin(
            audio,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
            sr=sample_rate,
        )
        # yin returns 0.0 for unvoiced frames instead of NaN — filter those out
        f0_voiced = f0[f0 > 0]
        return float(np.std(f0_voiced)) if len(f0_voiced) > 0 else 0.0
    except Exception as e:
        logger.warning(f"Pitch extraction failed: {e}")
        return 0.0


def _compute_energy_level(audio: np.ndarray) -> float:
    """RMS energy — proxy for vocal confidence and projection."""
    try:
        rms = librosa.feature.rms(y=audio)
        return float(np.mean(rms))
    except Exception as e:
        logger.warning(f"Energy extraction failed: {e}")
        return 0.0


def _compute_silence_ratio(audio: np.ndarray, sample_rate: int) -> float:
    """Ratio of silent frames to total frames."""
    try:
        intervals = librosa.effects.split(audio, top_db=30)
        if len(intervals) == 0:
            return 1.0
        speech_samples = sum(end - start for start, end in intervals)
        return 1.0 - (speech_samples / len(audio))
    except Exception as e:
        logger.warning(f"Silence ratio extraction failed: {e}")
        return 0.0


def _compute_confidence_proxy(words: list[dict]) -> float:
    """
    Average word probability from Whisper — proxy for speech clarity.
    Higher = clearer pronunciation and more confident delivery.
    """
    if not words:
        return 0.0
    probs = [w.get("probability", 0.0) for w in words]
    return float(np.mean(probs))