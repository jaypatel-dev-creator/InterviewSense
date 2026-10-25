from sqlalchemy import (
    String,
    Integer,
    Float,
    Boolean,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from core.logging import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    session_id: Mapped[str] = mapped_column(String, primary_key=True)
    candidate_name: Mapped[str | None] = mapped_column(String, nullable=True)
    domain: Mapped[str] = mapped_column(String, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    jd_text: Mapped[str | None] = mapped_column(String, nullable=True)
    start_time: Mapped[str] = mapped_column(String, nullable=False)
    end_time: Mapped[str | None] = mapped_column(String, nullable=True)
    composite_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    turns: Mapped[list["Turn"]] = relationship(
        "Turn", back_populates="session", cascade="all, delete-orphan"
    )
    report: Mapped["Report | None"] = relationship(
        "Report", back_populates="session", cascade="all, delete-orphan", uselist=False
    )


class Turn(Base):
    __tablename__ = "turns"

    turn_id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("sessions.session_id"), nullable=False
    )
    question_text: Mapped[str] = mapped_column(String, nullable=False)
    answer_transcript: Mapped[str | None] = mapped_column(String, nullable=True)
    correctness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    speech_metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # JSON column — SQLAlchemy handles serialization automatically.
    # No more manual json.dumps/json.loads in queries.py.
    next_question_type: Mapped[str | None] = mapped_column(String, nullable=True)
    jd_skill_targeted: Mapped[str | None] = mapped_column(String, nullable=True)
    # Which JD skill this question was designed to test — null if no JD provided
    timestamp: Mapped[str] = mapped_column(String, nullable=False)
    skipped: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    session: Mapped["Session"] = relationship("Session", back_populates="turns")


class Report(Base):
    __tablename__ = "reports"

    report_id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("sessions.session_id"), nullable=False, unique=True
    )
    technical_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    communication_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    pacing_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    composite_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    weak_topics: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # JSON column — stored as a JSON array, returned as a Python list automatically.
    jd_coverage: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # JSON column — {"tested": [...], "not_tested": [...], "coverage_pct": float}
    improvement_plan_text: Mapped[str | None] = mapped_column(String, nullable=True)
    langsmith_trace_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)

    session: Mapped["Session"] = relationship("Session", back_populates="report")
