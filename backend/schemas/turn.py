from pydantic import BaseModel


class SpeechMetrics(BaseModel):
    wpm: float = 0.0
    pause_count: int = 0
    filler_word_count: int = 0
    answer_duration_seconds: float = 0.0
   


class TurnResponse(BaseModel):
    turn_id: str
    session_id: str
    question_text: str
    answer_transcript: str | None
    correctness_score: float | None
    speech_metrics: SpeechMetrics | None
    next_question_type: str | None
    jd_skill_targeted: str | None = None  # JD skill this question was designed to test
    missing_concepts: list[str] = []
    strengths: list[str] = []
    difficulty_adjustment: str | None = None
    timestamp: str
    skipped: bool = False  # True when question was skipped — no answer, no evaluation