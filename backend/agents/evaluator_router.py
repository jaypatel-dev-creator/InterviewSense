from agents.state import SessionState
from agents.llm import get_llm
from schemas.evaluator_output import EvaluatorRouterOutput
from prompts.evaluator_router import build_evaluator_router_prompt
from core.logging import get_logger
from core.exceptions import AgentException
from domains.topics import Difficulty

logger = get_logger(__name__)

DIFFICULTY_LEVELS = [d.value for d in Difficulty]  # ordered easy -> medium -> hard
INCREASE_AT_SCORE = 8.0
DECREASE_AT_SCORE = 4.0


def _difficulty_adjustment_from_score(score: float) -> str:
    if score >= INCREASE_AT_SCORE:
        return "increase"
    if score <= DECREASE_AT_SCORE:
        return "decrease"
    return "maintain"


def _adjust_difficulty(current: str, adjustment: str) -> str:
    if current not in DIFFICULTY_LEVELS:
        return current
    index = DIFFICULTY_LEVELS.index(current)
    if adjustment == "increase":
        index = min(index + 1, len(DIFFICULTY_LEVELS) - 1)
    elif adjustment == "decrease":
        index = max(index - 1, 0)
    return DIFFICULTY_LEVELS[index]


def _match_jd_skill(skill: str | None, jd_skills: list[str]) -> str | None:
    if not skill:
        return None
    wanted = skill.strip().lower()
    for candidate in jd_skills:
        if candidate.strip().lower() == wanted:
            return candidate
    return None


async def evaluator_router_node(state: SessionState) -> dict:
    logger.debug("Evaluator-router node executing.")

    llm = get_llm()
    turns = state.get("turns", [])
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
        conversation_summary=state.get("conversation_summary", ""),
    )

    structured_llm = llm.with_structured_output(EvaluatorRouterOutput)

    try:
        result: EvaluatorRouterOutput = await structured_llm.ainvoke(prompt)
    except Exception as e:
        raise AgentException(f"Evaluator-router LLM call failed: {str(e)}")

    difficulty_adjustment = _difficulty_adjustment_from_score(result.correctness_score)
    new_difficulty = _adjust_difficulty(state["difficulty"], difficulty_adjustment)

    logger.debug(
        f"Evaluation complete — score: {result.correctness_score}, "
        f"difficulty: {state['difficulty']} -> {new_difficulty} ({difficulty_adjustment}), "
        f"next: {result.next_question_type}, "
        f"jd_skill_targeted: {result.jd_skill_targeted}"
    )

    updated_turn = {
        **latest_turn,
        "correctness_score": result.correctness_score,
        "missing_concepts": result.missing_concepts,
        "strengths": result.strengths,
        "next_question_type": result.next_question_type,
        "difficulty_adjustment": difficulty_adjustment,
        "jd_skill_targeted": _match_jd_skill(result.jd_skill_targeted, state.get("jd_skills", [])),
    }

    updated_turns = turns[:-1] + [updated_turn]

    next_question_number = state["current_question_number"] + 1
    interview_complete = next_question_number > int(state["question_count"])

    return {
        "turns": updated_turns,
        "current_question": result.next_question_text,
        "current_question_number": next_question_number,
        "interview_complete": interview_complete,
        "difficulty": new_difficulty,
    }