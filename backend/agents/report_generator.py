from agents.state import SessionState
from agents.llm import get_llm
from prompts.report_generator import build_report_prompt
from core.logging import get_logger
from core.exceptions import AgentException

logger = get_logger(__name__)


async def report_generator_node(state: SessionState) -> dict:
    """
    Report Generator Node — single LLM call at session end.
    Reads full session state, generates written improvement plan.
    """
    logger.debug("Report generator node executing.")

    llm = get_llm()
    turns = state.get("turns", [])

    if not turns:
        raise AgentException("Report generator called with no turns in state.")

    # Compute aggregate scores
    technical_scores = [
        t.get("correctness_score", 0.0)
        for t in turns
        if t.get("correctness_score") is not None
    ]

    # Use energy_level as vocal delivery proxy — confidence_proxy is dead
    # (Groq hardcodes word probabilities to 1.0, making it always 1.0).
    # energy_level is librosa RMS — actual signal, varies with delivery.
    # Skipped questions have no speech_metrics so energy = 0 — excluded.
    energy_scores = [
        t.get("speech_metrics", {}).get("energy_level", 0.0)
        for t in turns
        if t.get("speech_metrics", {}).get("energy_level", 0.0) > 0
    ]

    avg_technical = sum(technical_scores) / len(technical_scores) if technical_scores else 0.0
    # Rescale to 0–10 (cap at 0.10 RMS = 10) to match websocket.py scoring
    avg_energy_raw = sum(energy_scores) / len(energy_scores) if energy_scores else 0.0
    avg_speech = min(10.0, (avg_energy_raw / 0.10) * 10.0)

    prompt = build_report_prompt(
        domain=state["domain"],
        difficulty=state["difficulty"],
        candidate_name=state.get("candidate_name"),
        turns=turns,
        avg_technical_score=avg_technical,
        avg_speech_score=avg_speech,
    )

    try:
        response = await llm.ainvoke(prompt)
        improvement_plan = response.content
    except Exception as e:
        raise AgentException(f"Report generator LLM call failed: {str(e)}")

    logger.debug("Report generation complete.")

    return {
        "improvement_plan_text": improvement_plan,
    }