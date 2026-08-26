from pydantic import BaseModel, Field
from typing import Literal


class EvaluatorRouterOutput(BaseModel):
    # Evaluation
    correctness_score: float = Field(
        ge=0.0, le=10.0,
        description="Technical correctness score from 0 to 10"
    )
    missing_concepts: list[str] = Field(
        description="Key concepts the candidate missed or got wrong"
    )
    strengths: list[str] = Field(
        description="What the candidate got right or explained well"
    )

    # JD traceability — which JD skill this question targeted
    jd_skill_targeted: str | None = Field(
        default=None,
        description=(
            "The specific JD skill this question was designed to test. "
            "Must be one of the provided JD skills exactly as given, or null "
            "if no JD was provided or no skill maps to this question."
        )
    )

    # Routing
    next_question_type: Literal[
        "new_topic",
        "follow_up",
        "drill_down",
        "reframe",
        "wrap_up",
    ] = Field(
        description="Type of next question to ask based on performance"
    )
    next_question_text: str = Field(
        description="The exact next question to ask the candidate"
    )
    difficulty_adjustment: Literal["increase", "maintain", "decrease"] = Field(
        description="Whether to adjust difficulty for the next question"
    )