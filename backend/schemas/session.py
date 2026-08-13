from pydantic import BaseModel
from typing import Optional
from domains.topics import Domain, Difficulty


class SessionCreateRequest(BaseModel):
    candidate_name: Optional[str] = None
    domain: Domain
    difficulty: Difficulty
    question_count: int = 5
    jd_text: Optional[str] = None


class SessionResponse(BaseModel):
    session_id: str
    candidate_name: Optional[str]
    domain: str
    difficulty: str
    question_count: int
    jd_text: Optional[str]
    start_time: str
    end_time: Optional[str] = None
    composite_score: Optional[float] = None
