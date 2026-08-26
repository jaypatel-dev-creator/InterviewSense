from pydantic import BaseModel


class SpeechMetrics(BaseModel):
    wpm: float = 0.0
    pause_count: int = 0
    filler_word_count: int = 0
    answer_duration_seconds: float = 0.0
    pitch_variation: float = 0.0
    energy_level: float = 0.0
    silence_ratio: float = 0.0
    # confidence_proxy removed — Groq hardcodes word probabilities to 1.0,
    # making the field always 1.0 and meaningless. energy_level is used
    # instead as the vocal delivery proxy throughout the codebase.


class TurnResponse(BaseModel):
    turn_id: str
    session_id: str
    question_text: str
    answer_transcript: str | None
    correctness_score: float | None
    speech_metrics: SpeechMetrics | None
    next_question_type: str | None
    jd_skill_targeted: str | None = None  # JD skill this question was designed to test
    timestamp: str
    skipped: bool | None = None  # True when question was skipped — no answer, no evaluation