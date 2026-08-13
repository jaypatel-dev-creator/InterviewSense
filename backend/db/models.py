import aiosqlite
from core.logging import get_logger

logger = get_logger(__name__)

CREATE_SESSIONS_TABLE = """
CREATE TABLE IF NOT EXISTS sessions (
    session_id      TEXT PRIMARY KEY,
    candidate_name  TEXT,
    domain          TEXT NOT NULL,
    difficulty      TEXT NOT NULL,
    question_count  INTEGER NOT NULL,
    jd_text         TEXT,
    start_time      TEXT NOT NULL,
    end_time        TEXT,
    composite_score REAL
);
"""

CREATE_TURNS_TABLE = """
CREATE TABLE IF NOT EXISTS turns (
    turn_id              TEXT PRIMARY KEY,
    session_id           TEXT NOT NULL,
    question_text        TEXT NOT NULL,
    answer_transcript    TEXT,
    correctness_score    REAL,
    speech_metrics       TEXT,
    next_question_type   TEXT,
    timestamp            TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
"""

CREATE_REPORTS_TABLE = """
CREATE TABLE IF NOT EXISTS reports (
    report_id              TEXT PRIMARY KEY,
    session_id             TEXT NOT NULL UNIQUE,
    technical_score        REAL,
    communication_score    REAL,
    speech_score           REAL,
    composite_score        REAL,
    weak_topics            TEXT,
    improvement_plan_text  TEXT,
    langsmith_trace_url    TEXT,
    created_at             TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
"""


async def create_tables(db: aiosqlite.Connection) -> None:
    await db.execute(CREATE_SESSIONS_TABLE)
    await db.execute(CREATE_TURNS_TABLE)
    await db.execute(CREATE_REPORTS_TABLE)
    await db.commit()
    logger.info("Database tables created or verified.")
