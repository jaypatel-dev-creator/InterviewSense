import json
import aiosqlite
from core.logging import get_logger

logger = get_logger(__name__)


# --- Sessions ---

async def insert_session(db: aiosqlite.Connection, session: dict) -> None:
    await db.execute(
        """
        INSERT INTO sessions (
            session_id, candidate_name, domain, difficulty,
            question_count, jd_text, start_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            session["session_id"],
            session.get("candidate_name"),
            session["domain"],
            session["difficulty"],
            session["question_count"],
            session.get("jd_text"),
            session["start_time"],
        ),
    )
    await db.commit()
    logger.debug(f"Session inserted: {session['session_id']}")


async def update_session_end(
    db: aiosqlite.Connection,
    session_id: str,
    end_time: str,
    composite_score: float,
) -> None:
    await db.execute(
        """
        UPDATE sessions
        SET end_time = ?, composite_score = ?
        WHERE session_id = ?
        """,
        (end_time, composite_score, session_id),
    )
    await db.commit()


async def get_all_sessions(db: aiosqlite.Connection) -> list[dict]:
    async with db.execute(
        "SELECT * FROM sessions ORDER BY start_time DESC"
    ) as cursor:
        rows = await cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in rows]


async def get_session_by_id(
    db: aiosqlite.Connection, session_id: str
) -> dict | None:
    async with db.execute(
        "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
    ) as cursor:
        row = await cursor.fetchone()
        if row is None:
            return None
        columns = [desc[0] for desc in cursor.description]
        return dict(zip(columns, row))


async def delete_session(db: aiosqlite.Connection, session_id: str) -> bool:
    """
    Deletes a session and all associated turns and reports.
    Returns True if a session was deleted, False if not found.
    """
    await db.execute("DELETE FROM turns WHERE session_id = ?", (session_id,))
    await db.execute("DELETE FROM reports WHERE session_id = ?", (session_id,))
    cursor = await db.execute(
        "DELETE FROM sessions WHERE session_id = ?", (session_id,)
    )
    await db.commit()
    deleted = cursor.rowcount > 0
    if deleted:
        logger.debug(f"Session deleted: {session_id}")
    return deleted


# --- Turns ---

async def insert_turn(db: aiosqlite.Connection, turn: dict) -> None:
    await db.execute(
        """
        INSERT INTO turns (
            turn_id, session_id, question_text, answer_transcript,
            correctness_score, speech_metrics, next_question_type, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            turn["turn_id"],
            turn["session_id"],
            turn["question_text"],
            turn.get("answer_transcript"),
            turn.get("correctness_score"),
            json.dumps(turn.get("speech_metrics", {})),
            turn.get("next_question_type"),
            turn["timestamp"],
        ),
    )
    await db.commit()
    logger.debug(f"Turn inserted: {turn['turn_id']}")


async def get_turns_by_session(
    db: aiosqlite.Connection, session_id: str
) -> list[dict]:
    async with db.execute(
        "SELECT * FROM turns WHERE session_id = ? ORDER BY timestamp ASC",
        (session_id,),
    ) as cursor:
        rows = await cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        turns = []
        for row in rows:
            t = dict(zip(columns, row))
            t["speech_metrics"] = json.loads(t["speech_metrics"] or "{}")
            turns.append(t)
        return turns


# --- Reports ---

async def insert_report(db: aiosqlite.Connection, report: dict) -> None:
    await db.execute(
        """
        INSERT OR IGNORE INTO reports (
            report_id, session_id, technical_score, communication_score,
            speech_score, composite_score, weak_topics,
            improvement_plan_text, langsmith_trace_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            report["report_id"],
            report["session_id"],
            report.get("technical_score"),
            report.get("communication_score"),
            report.get("speech_score"),
            report.get("composite_score"),
            json.dumps(report.get("weak_topics", [])),
            report.get("improvement_plan_text"),
            report.get("langsmith_trace_url"),
            report["created_at"],
        ),
    )
    await db.commit()
    logger.debug(f"Report inserted: {report['report_id']}")


async def get_report_by_session(
    db: aiosqlite.Connection, session_id: str
) -> dict | None:
    async with db.execute(
        "SELECT * FROM reports WHERE session_id = ?", (session_id,)
    ) as cursor:
        row = await cursor.fetchone()
        if row is None:
            return None
        columns = [desc[0] for desc in cursor.description]
        r = dict(zip(columns, row))
        r["weak_topics"] = json.loads(r["weak_topics"] or "[]")
        return r