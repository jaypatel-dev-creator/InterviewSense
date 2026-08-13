import numpy as np
import io
import wave
from core.logging import get_logger

logger = get_logger(__name__)


def bytes_to_numpy(
    raw_bytes: bytes,
    dtype: np.dtype = np.float32,
) -> np.ndarray:
    """
    Converts raw audio bytes from WebSocket into a numpy array.
    Expects float32 PCM bytes from the frontend AudioWorklet.
    """
    return np.frombuffer(raw_bytes, dtype=dtype)


def normalize_audio(audio: np.ndarray) -> np.ndarray:
    """
    Normalizes audio to [-1, 1] range.
    Prevents clipping artifacts in librosa feature extraction.
    """
    max_val = np.max(np.abs(audio))
    if max_val == 0:
        return audio
    return audio / max_val


def ensure_mono(audio: np.ndarray) -> np.ndarray:
    """
    Ensures audio is mono (1D array).
    If stereo (2D), averages both channels.
    """
    if audio.ndim == 2:
        return np.mean(audio, axis=1)
    return audio


def trim_silence(
    audio: np.ndarray,
    threshold: float = 0.01,
) -> np.ndarray:
    """
    Trims leading and trailing silence from audio.
    threshold: amplitude below which is considered silence.
    """
    non_silent = np.where(np.abs(audio) > threshold)[0]
    if len(non_silent) == 0:
        return audio
    return audio[non_silent[0]: non_silent[-1] + 1]


def numpy_to_wav_bytes(
    audio: np.ndarray,
    sample_rate: int = 16000,
) -> bytes:
    """
    Converts a float32 numpy array to WAV bytes.
    Useful for debugging — write to file or stream.
    """
    pcm = (audio * 32767).astype(np.int16)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return buffer.getvalue()


def compute_audio_duration(
    audio: np.ndarray,
    sample_rate: int = 16000,
) -> float:
    """Returns duration of audio in seconds."""
    return len(audio) / sample_rate