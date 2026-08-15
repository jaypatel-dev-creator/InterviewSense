from agents.state import SessionState
from agents.llm import get_llm
from schemas.evaluator_output import EvaluatorRouterOutput
from prompts.evaluator_router import build_evaluator_router_prompt
from domains.topics import SEED_TOPICS
from core.logging import get_logger
from core.exceptions import AgentException

logger = get_logger(__name__)


async def evaluator_router_node(state: SessionState) -> dict:
    """
    Evaluator-Router Node — single LLM call with structured Pydantic output.

    Evaluates the candidate's answer AND decides the next question
    in one shot. Merges what would otherwise be two separate agents.
    """
    logger.debug("Evaluator-router node executing.")

    llm = get_llm()
    turns = state.get("turns", [])

    if not turns:
        raise AgentException("Evaluator-router called with no turns in state.")

    latest_turn = turns[-1]
    topics_covered = [t.get("question_text", "")[:50] for t in turns[:-1]]

    prompt = build_evaluator_router_prompt(
        domain=state["domain"],
        difficulty=state["difficulty"],
        question_text=latest_turn.get("question_text", ""),
        answer_transcript=latest_turn.get("answer_transcript", ""),
        topics_covered=topics_covered,
        current_question_number=state["current_question_number"],
        question_count=state["question_count"],
        jd_skills=state.get("jd_skills", []),
    )

    structured_llm = llm.with_structured_output(EvaluatorRouterOutput)

    try:
        result: EvaluatorRouterOutput = await structured_llm.ainvoke(prompt)
    except Exception as e:
        raise AgentException(f"Evaluator-router LLM call failed: {str(e)}")

    logger.debug(
        f"Evaluation complete — score: {result.correctness_score}, "
        f"next: {result.next_question_type}"
    )

    # Update latest turn with evaluation results
    updated_turn = {
        **latest_turn,
        "correctness_score": result.correctness_score,
        "missing_concepts": result.missing_concepts,
        "strengths": result.strengths,
        "next_question_type": result.next_question_type,
        "difficulty_adjustment": result.difficulty_adjustment,
    }

    updated_turns = turns[:-1] + [updated_turn]

    # Increment first, then check — prevents off-by-one early termination.
    # Cast to int guards against question_count arriving as a string from query params.
    next_question_number = state["current_question_number"] + 1
    interview_complete = next_question_number > int(state["question_count"])

    return {
        "turns": updated_turns,
        "current_question": result.next_question_text,
        "current_question_number": next_question_number,
        "interview_complete": interview_complete,
    }