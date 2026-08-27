from pydantic import BaseModel


class ReportResponse(BaseModel):
    report_id: str
    session_id: str
    technical_score: float | None      # avg correctness_score across turns (0–10)
    communication_score: float | None  # avg energy_level rescaled (0–10)
    pacing_score: float | None         # WPM-based score (0–10, ideal 120–160 wpm)
    composite_score: float | None      # weighted: technical 60%, communication 25%, pacing 15%
    weak_topics: list[str]
    jd_coverage: dict | None = None
    # {"tested": [...], "not_tested": [...], "coverage_pct": float}
    # null when no JD was provided for the session
    improvement_plan_text: str | None
    langsmith_trace_url: str | None
    created_at: str