from pydantic import BaseModel
from typing import Optional


class ReportResponse(BaseModel):
    report_id: str
    session_id: str
    technical_score: Optional[float]
    communication_score: Optional[float]
    speech_score: Optional[float]
    composite_score: Optional[float]
    weak_topics: list[str]
    improvement_plan_text: Optional[str]
    langsmith_trace_url: Optional[str]
    created_at: str 
