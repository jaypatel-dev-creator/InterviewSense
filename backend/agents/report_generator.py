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

    technical_score and communication_score are read directly from state —
    computed once in finalize_session() and passed into the graph. No
    recomputation here, single source of truth.
    """
    logger.debug("Report generator node executing.")

    llm = get_llm()
    turns = state.get("turns", [])

    # Read technical_score and communication_score from state — both are set by
    # finalize_session() before graph.ainvoke(), so the prompt quotes the same
    # numbers as the report card. communication_score is None when fewer than
    # half the turns had voice answers.
    avg_technical = state.get("technical_score") or 0.0
    avg_speech = state.get("communication_score")

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
        logger.debug(f"Raw response.content type: {type(response.content)}, value: {repr(response.content)[:300]}")
        raw = response.content
        if isinstance(raw, list):
            improvement_plan = "".join(
                part.get("text", "") if isinstance(part, dict) else
                (part.text if hasattr(part, "text") else "")
                for part in raw
            ).strip()
        elif isinstance(raw, str):
            improvement_plan = raw.strip()
        else:
            improvement_plan = str(raw).strip()
    except Exception as e:
        raise AgentException(f"Report generator LLM call failed: {str(e)}")

    logger.debug("Report generation complete.")

    return {
        "improvement_plan_text": improvement_plan,
    }