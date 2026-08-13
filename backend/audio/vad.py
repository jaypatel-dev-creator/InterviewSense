import numpy as np
import torch
from silero_vad import load_silero_vad
from core.logging import get_logger

logger = get_logger(__name__)

# Module-level singleton — loaded once at startup
_vad_model = None
_vad_utils = None


def load_vad() -> None:
    global _vad_model, _vad_utils
    _vad_model = load_silero_vad()
    _vad_model.eval()
    logger.info("Silero VAD model loaded.")


def get_vad_model():
    if _vad_model is None:
        raise RuntimeError("VAD not initialized. Call load_vad() on startup.")
    return _vad_model


def is_speech(audio_chunk: np.ndarray, sample_rate: int = 16000) -> bool:
    """
    Returns True if the audio chunk contains speech.
    audio_chunk must be mono float32 numpy array at 16000Hz.
    """
    model = get_vad_model()
    tensor = torch.from_numpy(audio_chunk).float()
    if tensor.dim() == 1:
        tensor = tensor.unsqueeze(0)
    with torch.no_grad():
        confidence = model(tensor, sample_rate).item()
    return confidence > 0.5


def detect_speech_chunks(
    audio: np.ndarray,
    sample_rate: int = 16000,
    chunk_size_ms: int = 30,
) -> list[tuple[int, int]]:
    """
    Splits audio into chunks and returns (start, end) sample indices
    of chunks detected as speech.
    """
    chunk_samples = int(sample_rate * chunk_size_ms / 1000)
    speech_segments = []
    in_speech = False
    speech_start = 0

    for i in range(0, len(audio), chunk_samples):
        chunk = audio[i: i + chunk_samples]
        if len(chunk) < chunk_samples:
            chunk = np.pad(chunk, (0, chunk_samples - len(chunk)))

        if is_speech(chunk, sample_rate):
            if not in_speech:
                speech_start = i
                in_speech = True
        else:
            if in_speech:
                speech_segments.append((speech_start, i))
                in_speech = False

    if in_speech:
        speech_segments.append((speech_start, len(audio)))

    return speech_segments 
