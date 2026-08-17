]from pydantic import BaseModel
from typing import Optional


class ReportResponse(BaseModel):
    report_id: str
    session_id: str
    technical_score: Optional[float]   # avg correctness_score across turns (0–10)
    communication_score: Optional[float]  # avg energy_level rescaled (0–10)
    pacing_score: Optional[float]      # WPM-based score (0–10, ideal 120–160 wpm)
    composite_score: Optional[float]   # weighted: technical 60%, communication 25%, pacing 15%
    weak_topics: list[str]
    improvement_plan_text: Optional[str]
    langsmith_trace_url: Optional[str]
    created_at: str