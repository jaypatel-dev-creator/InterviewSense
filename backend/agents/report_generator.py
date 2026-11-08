from agents.state import SessionState
from agents.llm import get_llm
from prompts.report_generator import build_report_prompt
from core.logging import get_logger
from core.exceptions import AgentException

logger = get_logger(__name__)


# Called from: orchestrator.py (graph node, registered in compile_graph)
async def report_generator_node(state: SessionState) -> dict:
   
    logger.debug("Report generator node executing.")

    llm = get_llm()
    turns = state.get("turns", [])

    
    avg_technical = state.get("technical_score") or 0.0
    avg_speech = state.get("communication_score")

    # Skipped turns are in `turns` but were not answered
    questions_answered = sum(1 for t in turns if not t.get("skipped"))

    prompt = build_report_prompt(
        domain=state["domain"],
        difficulty=state["difficulty"],
        candidate_name=state.get("candidate_name"),
        turns=turns,
        avg_technical_score=avg_technical,
        avg_speech_score=avg_speech,
        questions_answered=questions_answered,
        question_count=int(state["question_count"]),
    )

    try:
        response = await llm.ainvoke(prompt)
        logger.debug(f"Raw response.content type: {type(response.content)}, value: {repr(response.content)[:300]}")
        raw = response.content
        #normalizing gemini's output that can come in two format 
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