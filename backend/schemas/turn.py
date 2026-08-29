from pydantic import BaseModel


class SpeechMetrics(BaseModel):
    wpm: float = 0.0
    pause_count: int = 0
    filler_word_count: int = 0
    answer_duration_seconds: float = 0.0
    # energy_level and pitch_variation removed — librosa dependency dropped.
    # Both were basic signal processing metrics (RMS and F0 std dev),
    # not actionable for interview feedback. All metrics are now derived
    # purely from Whisper word-level timestamps.


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