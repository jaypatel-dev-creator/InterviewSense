from pydantic import BaseModel
from domains.topics import Domain, Difficulty


class SessionCreateRequest(BaseModel):
    candidate_name: str | None = None
    domain: Domain
    difficulty: Difficulty
    question_count: int = 5
    jd_text: str | None = None


class SessionResponse(BaseModel):
    session_id: str
    candidate_name: str | None
    domain: str
    difficulty: str
    question_count: int
    jd_text: str | None
    start_time: str
    end_time: str | None = None
    composite_score: float | None = None