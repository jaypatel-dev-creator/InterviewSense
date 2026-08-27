from agents.state import SessionState
from core.logging import get_logger
from core.exceptions import AgentException

logger = get_logger(__name__)


async def speech_analytics_node(state: SessionState) -> dict:
    """
    Speech Analytics Node — pure Python, no LLM call.

    Acts as the graph's validation gate — runs first on every invocation
    and fails fast if state is malformed before any LLM call is made.

    Audio processing (Whisper transcription + librosa signal analysis) runs
    pre-graph in the WebSocket handler via process_audio_chunk(). This is
    intentional: transcript_update must reach the client immediately after
    the candidate finishes speaking, and cannot wait for graph invocation
    latency. By the time this node runs, speech_metrics and answer_transcript
    are already populated in state by the WebSocket handler.

    This node validates their presence, logs key paralinguistic signals,
    and acts as the single guard so downstream LLM nodes (evaluator_router,
    report_generator) can assume clean state without redundant checks.
    """
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