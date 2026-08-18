from agents.state import SessionState
from core.logging import get_logger

logger = get_logger(__name__)


async def speech_analytics_node(state: SessionState) -> dict:
    """
    Speech Analytics Node — pure Python, no LLM call.

    Reads audio processing results already attached to state
    by the WebSocket handler after parallel Whisper + librosa processing.

    Updates the latest turn with finalized speech metrics and transcript.
    """
    logger.debug("Speech analytics node executing.")

    turns = state.get("turns", [])
    if not turns:
        logger.warning("Speech analytics node called with no turns in state.")
        return {}

    latest_turn = turns[-1]

    # Speech metrics and transcript are set by the WebSocket handler
    # after audio/processor.py runs. Node validates and logs only.
    speech_metrics = latest_turn.get("speech_metrics", {})
    transcript = latest_turn.get("answer_transcript", "")

    logger.debug(
        f"Turn {len(turns)} — "
        f"WPM: {speech_metrics.get('wpm', 0)}, "
        f"Pauses: {speech_metrics.get('pause_count', 0)}, "
        f"Fillers: {speech_metrics.get('filler_word_count', 0)} "
        
    )

    # No state mutation needed — metrics already in state from processor
    return {} 
