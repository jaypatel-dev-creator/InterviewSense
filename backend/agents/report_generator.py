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
    speech_scores = [
        t.get("speech_metrics", {}).get("confidence_proxy", 0.0)
        for t in turns
    ]

    avg_technical = sum(technical_scores) / len(technical_scores) if technical_scores else 0.0
    avg_speech = sum(speech_scores) / len(speech_scores) if speech_scores else 0.0

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
