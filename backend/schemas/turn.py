from pydantic import BaseModel
from typing import Optional


class SpeechMetrics(BaseModel):
    wpm: float = 0.0
    pause_count: int = 0
    filler_word_count: int = 0
    answer_duration_seconds: float = 0.0
    pitch_variation: float = 0.0
    energy_level: float = 0.0
    silence_ratio: float = 0.0
    confidence_proxy: float = 0.0


class TurnResponse(BaseModel):
    turn_id: str
    session_id: str
    question_text: str
    answer_transcript: Optional[str]
    correctness_score: Optional[float]
    speech_metrics: Optional[SpeechMetrics]
    next_question_type: Optional[str]
    timestamp: str 
