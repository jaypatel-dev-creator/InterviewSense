from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class Turn(TypedDict, total=False):
    turn_id: str
    question_text: str
    answer_transcript: str
    correctness_score: float
    missing_concepts: list[str]
    strengths: list[str]
    next_question_type: str
    difficulty_adjustment: str
    jd_skill_targeted: str | None  # JD skill this question was designed to test
    speech_metrics: dict
    timestamp: str
    skipped: bool  # True when question was skipped — no answer, no evaluation


def _replace_turns(existing: list, updated: list) -> list:
    """
    Replace, don't append. The evaluator_router returns the full updated
    turns list — if LangGraph merges via x + y, turns double-accumulate
    by Q2 and corrupt the evaluation context from that point onward.
    """
    return updated if updated else existing


class SessionState(TypedDict):
    # Session identity
    session_id: str
    candidate_name: str
    domain: str
    difficulty: str
    question_count: int
    jd_text: str
    jd_skills: list[str]

    # Interview progress
    current_question: str
    current_question_number: int
    turns: Annotated[list[Turn], _replace_turns]

    # Agent messages — LangGraph managed
    messages: Annotated[list[BaseMessage], add_messages]

    # Session control
    interview_complete: bool

    # Rolling conversation summary — plain text, appended after each answered turn.
    # Injected into evaluator-router prompt so the LLM knows how the candidate
    # answered previous questions when generating the next one.
    # Transient — never persisted to DB, lives only during the WebSocket session.
    conversation_summary: str

    # Report output — populated by report_generator_node
    improvement_plan_text: str