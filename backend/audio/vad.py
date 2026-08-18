import numpy as np
import torch
from silero_vad import load_silero_vad
from core.logging import get_logger

logger = get_logger(__name__)

# Module-level singleton — loaded once at startup
_vad_model = None


def load_vad() -> None:
    global _vad_model
    _vad_model = load_silero_vad()
    _vad_model.eval()
    logger.info("Silero VAD model loaded.")
    # Note: silero-vad v2+ returns only the model from load_silero_vad().
    # The _vad_utils pattern from v1 (which returned (model, utils)) is gone.


def get_vad_model():
    if _vad_model is None:
        raise RuntimeError("VAD not initialized. Call load_vad() on startup.")
    return _vad_model