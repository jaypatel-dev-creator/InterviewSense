from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Session, Turn, Report
from core.logging import get_logger

logger = get_logger(__name__)


# --- Sessions ---

async def insert_session(db: AsyncSession, session: dict) -> None:
    db.add(Session(
        session_id=session["session_id"],
        candidate_name=session.get("candidate_name"),
        domain=session["domain"],
        difficulty=session["difficulty"],
        question_count=session["question_count"],
        jd_text=session.get("jd_text"),
        start_time=session["start_time"],
    ))
    await db.flush()
    logger.debug(f"Session inserted: {session['session_id']}")


async def update_session_end(
    db: AsyncSession,
    session_id: str,
    end_time: str,
    composite_score: float,
) -> None:
    await db.execute(
        update(Session)
        .where(Session.session_id == session_id)
        .values(end_time=end_time, composite_score=composite_score)
    )


async def get_all_sessions(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Session).order_by(Session.start_time.desc())
    )
    sessions = result.scalars().all()
    return [_session_to_dict(s) for s in sessions]


async def get_session_by_id(
    db: AsyncSession, session_id: str
) -> dict | None:
    result = await db.execute(
        select(Session).where(Session.session_id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        return None
    return _session_to_dict(session)


async def delete_session(db: AsyncSession, session_id: str) -> bool:
    """
    Deletes a session and all associated turns and reports.
    Returns True if a session was deleted, False if not found.

    Note: cascade='all, delete-orphan' on the ORM relationship only fires for
    ORM-level object deletion (load object → session.delete(obj)). Bulk SQL
    DELETE via db.execute(delete(Model)) bypasses the ORM entirely — cascade
    does not fire. Manual child deletion is required to avoid FK violations.
    """
    await db.execute(delete(Turn).where(Turn.session_id == session_id))
    await db.execute(delete(Report).where(Report.session_id == session_id))
    result = await db.execute(
        delete(Session).where(Session.session_id == session_id)
    )
    deleted = result.rowcount > 0
    if deleted:
        logger.debug(f"Session deleted: {session_id}")
    return deleted


async def delete_all_sessions(db: AsyncSession) -> int:
    """
    Deletes all sessions, turns, and reports.
    Returns count of sessions deleted.
    """
    # Get count before deletion
    count_result = await db.execute(select(func.count()).select_from(Session))
    count = count_result.scalar() or 0

    # Manual child deletion required — bulk SQL DELETE bypasses ORM cascade.
    # Delete children before parent to respect FK constraints.
    await db.execute(delete(Turn))
    await db.execute(delete(Report))
    await db.execute(delete(Session))

    logger.debug(f"All sessions deleted: {count} removed")
    return count


# --- Turns ---

async def insert_turn(db: AsyncSession, turn: dict) -> None:
    db.add(Turn(
        turn_id=turn["turn_id"],
        session_id=turn["session_id"],
        question_text=turn["question_text"],
        answer_transcript=turn.get("answer_transcript"),
        correctness_score=turn.get("correctness_score"),
        speech_metrics=turn.get("speech_metrics", {}),
        # JSON column — SQLAlchemy serializes dict automatically. No json.dumps needed.
        next_question_type=turn.get("next_question_type"),
        jd_skill_targeted=turn.get("jd_skill_targeted"),
        timestamp=turn["timestamp"],
        skipped=turn.get("skipped"),
    ))
    await db.flush()
    logger.debug(f"Turn inserted: {turn['turn_id']}")


async def get_turns_by_session(
    db: AsyncSession, session_id: str
) -> list[dict]:
    result = await db.execute(
        select(Turn)
        .where(Turn.session_id == session_id)
        .order_by(Turn.timestamp.asc())
    )
    turns = result.scalars().all()
    return [_turn_to_dict(t) for t in turns]


# --- Reports ---

async def insert_report(db: AsyncSession, report: dict) -> None:
    # INSERT OR IGNORE equivalent — skip if report for this session already exists.
    # Prevents duplicate report inserts when _finalize_session is called twice
    # (e.g. end_interview message arrives while last turn is still processing).
    existing = await db.execute(
        select(Report).where(Report.session_id == report["session_id"])
    )
    if existing.scalar_one_or_none() is not None:
        logger.debug(f"Report already exists for session: {report['session_id']} — skipping insert")
        return

    db.add(Report(
        report_id=report["report_id"],
        session_id=report["session_id"],
        technical_score=report.get("technical_score"),
        communication_score=report.get("communication_score"),
        pacing_score=report.get("pacing_score"),
        composite_score=report.get("composite_score"),
        weak_topics=report.get("weak_topics", []),
        # JSON column — SQLAlchemy serializes list automatically. No json.dumps needed.
        jd_coverage=report.get("jd_coverage"),
        improvement_plan_text=report.get("improvement_plan_text"),
        langsmith_trace_url=report.get("langsmith_trace_url"),
        created_at=report["created_at"],
    ))
    await db.flush()
    logger.debug(f"Report inserted: {report['report_id']}")


async def get_report_by_session(
    db: AsyncSession, session_id: str
) -> dict | None:
    result = await db.execute(
        select(Report).where(Report.session_id == session_id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        return None
    return _report_to_dict(report)


# --- ORM → dict helpers ---
# Callers (routes.py, websocket.py) work with plain dicts — not ORM objects.
# These helpers keep the return type identical to the old aiosqlite queries
# so no caller needs to change.

def _session_to_dict(s: Session) -> dict:
    return {
        "session_id": s.session_id,
        "candidate_name": s.candidate_name,
        "domain": s.domain,
        "difficulty": s.difficulty,
        "question_count": s.question_count,
        "jd_text": s.jd_text,
        "start_time": s.start_time,
        "end_time": s.end_time,
        "composite_score": s.composite_score,
    }


def _turn_to_dict(t: Turn) -> dict:
    return {
        "turn_id": t.turn_id,
        "session_id": t.session_id,
        "question_text": t.question_text,
        "answer_transcript": t.answer_transcript,
        "correctness_score": t.correctness_score,
        "speech_metrics": t.speech_metrics or {},
        # JSON column — SQLAlchemy deserializes automatically. No json.loads needed.
        "next_question_type": t.next_question_type,
        "jd_skill_targeted": t.jd_skill_targeted,
        "timestamp": t.timestamp,
        "skipped": t.skipped,
    }


def _report_to_dict(r: Report) -> dict:
    return {
        "report_id": r.report_id,
        "session_id": r.session_id,
        "technical_score": r.technical_score,
        "communication_score": r.communication_score,
        "pacing_score": r.pacing_score,
        "composite_score": r.composite_score,
        "weak_topics": r.weak_topics or [],
        # JSON column — SQLAlchemy deserializes automatically. No json.loads needed.
        "jd_coverage": r.jd_coverage,
        "improvement_plan_text": r.improvement_plan_text,
        "langsmith_trace_url": r.langsmith_trace_url,
        "created_at": r.created_at,
    }