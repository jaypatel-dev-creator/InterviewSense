from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class Turn(TypedDict):
    turn_id: str
    question_text: str
    answer_transcript: str
    correctness_score: float
    missing_concepts: list[str]
    strengths: list[str]
    next_question_type: str
    difficulty_adjustment: str
    speech_metrics: dict
    timestamp: str


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
    turns: Annotated[list[Turn], lambda x, y: x + y]

    # Agent messages — LangGraph managed
    messages: Annotated[list[BaseMessage], add_messages]

    # Session control
    interview_complete: bool