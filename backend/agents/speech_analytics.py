from agents.state import SessionState
from core.logging import get_logger
from core.exceptions import AgentException

logger = get_logger(__name__)


async def speech_analytics_node(state: SessionState) -> dict:
    logger.debug("Speech analytics node executing.")

    turns = state.get("turns", [])
    if not turns:
        raise AgentException("Speech analytics node called with no turns in state.")

    latest_turn = turns[-1]

    speech_metrics = latest_turn.get("speech_metrics", {})
    transcript = latest_turn.get("answer_transcript", "")

    if not transcript.strip() and not latest_turn.get("skipped", False):
        raise AgentException("Speech analytics node: latest turn has empty transcript.")

    logger.debug(
        f"Turn {len(turns)} — "
        f"WPM: {speech_metrics.get('wpm', 0)}, "
        f"Pauses: {speech_metrics.get('pause_count', 0)}, "
        f"Fillers: {speech_metrics.get('filler_word_count', 0)} "
    )

    return {}