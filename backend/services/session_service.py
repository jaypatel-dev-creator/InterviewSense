import uuid
import json
from datetime import datetime, timezone

from fastapi import WebSocket

from agents.state import SessionState
from agents.llm import get_llm
from db.database import get_db
from db.queries import insert_report, update_session_end
from prompts.evaluator_router import build_first_question_prompt
from prompts.jd_extractor import build_jd_extractor_prompt
from domains.topics import SEED_TOPICS
from core.logging import get_logger
from core.exceptions import AgentException

logger = get_logger(__name__)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_text(response) -> str:
    """
    langchain-google-genai returns response.content as a list of dicts:
    [{'type': 'text', 'text': '...', 'extras': {'signature': '...'}}]
    Extract all 'text' values and join them.
    """
    content = response.content
    if isinstance(content, list):
        return "".join(
            part.get("text", "") if isinstance(part, dict) else
            (part.text if hasattr(part, "text") else "")
            for part in content
        ).strip()
    if isinstance(content, str):
        return content.strip()
    return str(content).strip()


async def extract_jd_skills(jd_text: str) -> list[str]:
    """
    Extracts role-specific skills from a job description via a Gemini call.
    Returns an empty list when JD is empty or extraction fails — non-fatal,
    session continues without JD grounding.
    """
    if not jd_text or not jd_text.strip():
        return []
    llm = get_llm()
    prompt = build_jd_extractor_prompt(jd_text)
    try:
        response = await llm.ainvoke(prompt)
        content = _extract_text(response)
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        skills = json.loads(content.strip())
        return skills if isinstance(skills, list) else []
    except Exception as e:
        logger.warning(f"JD skill extraction failed: {e}", exc_info=True)
        return []


async def generate_first_question(
    domain: str,
    difficulty: str,
    jd_skills: list[str],
) -> str:
    """
    Generates the opening question for a session (or a replacement question
    after a skip) via a Gemini call. Falls back to a generic domain question
    on failure — non-fatal, session continues with a degraded first question.
    """
    llm = get_llm()
    seed_topics = SEED_TOPICS.get(domain, [])
    prompt = build_first_question_prompt(
        domain=domain,
        difficulty=difficulty,
        seed_topics=seed_topics,
        jd_skills=jd_skills,
    )
    try:
        logger.info(f"Generating first question — domain: {domain}, difficulty: {difficulty}")
        response = await llm.ainvoke(prompt)
        question = _extract_text(response)
        logger.info(f"First question generated: {question[:80]}")
        return question
    except Exception as e:
        logger.error(f"First question generation failed: {e}", exc_info=True)
        return f"Tell me about your experience with {domain.replace('_', ' ')}."


def build_conversation_summary_line(state: SessionState, evaluated_turn: dict) -> str:
    """
    Builds one plain-text line summarising the evaluated turn.
    Appended to state['conversation_summary'] after each answered turn
    so the evaluator-router has prior Q&A context when generating the next question.

    Format: "Q{n}: {question[:80]} | Score: {score}/10 | A: {answer[:200]}"
    Answer truncated to 200 chars to keep prompt size bounded over 10 questions.
    No LLM call — pure string formatting.
    """
    score_str = (
        f"{evaluated_turn.get('correctness_score', 0):.1f}"
        if evaluated_turn.get("correctness_score") is not None
        else "N/A"
    )
    answer_preview = (evaluated_turn.get("answer_transcript") or "")[:200]
    return (
        f"Q{state['current_question_number'] - 1}: "
        f"{evaluated_turn.get('question_text', '')[:80]} "
        f"| Score: {score_str}/10 | A: {answer_preview}"
    )


def _compute_pacing_score(wpm: float) -> float:
    """
    Converts WPM to a 0-10 score.
    Ideal interview pace is 120-160 wpm — score 10.
    Outside that range score degrades linearly.
    Below 80 or above 220 — floor at 2.0.
    Returns 0.0 if wpm is 0 (no speech detected).
    """
    if wpm <= 0:
        return 0.0
    if 120 <= wpm <= 160:
        return 10.0
    if wpm < 120:
        score = 2.0 + (wpm - 80) * (8.0 / 40)
    else:
        score = 10.0 - (wpm - 160) * (8.0 / 60)
    return round(max(2.0, min(10.0, score)), 2)


def _compute_communication_score(speech_metrics: dict) -> float:
    """
    Fluency-based communication score derived entirely from Whisper word timestamps.

    librosa removed — energy_level (RMS) and pitch_variation (F0 std dev) were
    basic signal processing metrics not actionable for interview feedback.

    Formula (research-backed thresholds):

    Filler score (60% weight):
        filler_rate = filler_word_count / total_words
        0% fillers → 10.0 | 5% fillers → 5.0 | 10%+ fillers → 0.0
        Source: Quantified Communications; Duvall et al. (2014) — 5% threshold
        is where filler usage becomes noticeable in professional contexts.

    Pause score (40% weight):
        0 pauses → 10.0 | 3 pauses → 5.5 | 7+ pauses → 0.0
        pause_threshold in analyzer.py is 1.5s — aligns with speech fluency
        research classification of "long pauses" (≥1.5s).
        Source: Interview communication research — 3–5s pauses rated uncomfortable,
        6s+ rated damaging by interviewers.
    """
    filler_count = speech_metrics.get("filler_word_count", 0)
    pause_count = speech_metrics.get("pause_count", 0)
    wpm = speech_metrics.get("wpm", 0.0)
    duration = speech_metrics.get("answer_duration_seconds", 0.0)

    # Approximate total word count from WPM and duration
    total_words = max(1, round((wpm / 60) * duration)) if wpm > 0 and duration > 0 else 1

    # Filler score — degrades linearly from 0% to 10% filler rate
    filler_rate = filler_count / total_words
    filler_score = max(0.0, 10.0 - (filler_rate / 0.05) * 5.0)

    # Pause score — each long pause (>1.5s) costs 1.5 points
    pause_score = max(0.0, 10.0 - pause_count * 1.5)

    weighted = (filler_score * 0.60) + (pause_score * 0.40)
    return round(min(10.0, weighted), 2)


async def finalize_session(
    websocket: WebSocket,
    state: SessionState,
    session_id: str,
    graph,
) -> None:
    """
    Finalizes the interview session:
    - Computes technical, communication, pacing, and composite scores
    - Computes JD coverage if JD skills were provided
    - Invokes report_generator_node via the graph with communication_score in state
    - Persists report and session end time to DB
    - Sends report_ready WebSocket event to frontend

    Extracted from websocket.py to keep the WebSocket handler as a
    pure protocol layer — message routing only, no scoring business logic.
    """
    logger.info(f"Finalizing session: {session_id}")

    # 0-turn guard — user ended before answering or skipping anything
    if not state["turns"]:
        logger.warning(f"Session {session_id} ended with 0 turns — emitting empty report.")
        empty_report = {
            "report_id": str(uuid.uuid4()),
            "session_id": session_id,
            "technical_score": 0.0,
            "communication_score": None,
            "pacing_score": None,
            "composite_score": 0.0,
            "weak_topics": [],
            "jd_coverage": None,
            "improvement_plan_text": "No questions were answered in this session.",
            "langsmith_trace_url": "",
            "created_at": utcnow_iso(),
        }
        async with get_db() as db:
            await update_session_end(db, session_id, utcnow_iso(), 0.0)
            await insert_report(db, empty_report)
        await websocket.send_json({
            "type": "report_ready",
            "report": empty_report,
            "turns": [],
        })
        logger.info(f"Empty report sent for session: {session_id}")
        return

    turns = state["turns"]
    question_count = state["question_count"]

    # Technical score — avg correctness divided by question_count so skips penalise
    technical_scores = [
        t.get("correctness_score", 0.0)
        for t in turns
        if t.get("correctness_score") is not None
    ]
    avg_technical = sum(technical_scores) / question_count if technical_scores else 0.0

    # Communication score — fluency-based (filler rate + pause count).
    # Guard: wpm > 0 confirms a voice answer was recorded for this turn.
    # N/A if fewer than half the questions had voice answers.
    voice_turns = [
        t for t in turns
        if t.get("speech_metrics", {}).get("wpm", 0.0) > 0
    ]
    if len(voice_turns) >= question_count / 2:
        avg_communication = sum(
            _compute_communication_score(t["speech_metrics"])
            for t in voice_turns
        ) / len(voice_turns)
    else:
        avg_communication = None

    # Pacing score — N/A if fewer than half questions had voice answers
    wpm_turns = [
        t for t in turns
        if t.get("speech_metrics", {}).get("wpm", 0.0) > 0
    ]
    if len(wpm_turns) >= question_count / 2:
        avg_pacing = sum(
            _compute_pacing_score(t["speech_metrics"]["wpm"])
            for t in wpm_turns
        ) / len(wpm_turns)
    else:
        avg_pacing = None

    # Composite — redistribute weights when communication or pacing is N/A
    if avg_communication is not None and avg_pacing is not None:
        composite = round(avg_technical * 0.60 + avg_communication * 0.25 + avg_pacing * 0.15, 2)
    elif avg_communication is not None:
        composite = round(avg_technical * 0.75 + avg_communication * 0.25, 2)
    elif avg_pacing is not None:
        composite = round(avg_technical * 0.85 + avg_pacing * 0.15, 2)
    else:
        composite = round(avg_technical, 2)

    # JD coverage — only when JD skills were provided
    jd_skills = state.get("jd_skills", [])
    if jd_skills:
        tested_skills = list({
            t.get("jd_skill_targeted")
            for t in turns
            if t.get("jd_skill_targeted")
        })
        not_tested_skills = [s for s in jd_skills if s not in tested_skills]
        jd_coverage = {
            "tested": tested_skills,
            "not_tested": not_tested_skills,
            "coverage_pct": round(len(tested_skills) / len(jd_skills) * 100, 1),
        }
    else:
        jd_coverage = None

    # Pass communication_score into state so report_generator_node reads it
    # directly — single source of truth, no recomputation inside the graph.
    result = await graph.ainvoke({
        **state,
        "interview_complete": True,
        "communication_score": avg_communication,
    })
    improvement_plan = (
        result.get("improvement_plan_text", "")
        or "No improvement plan was generated for this session."
    )

    report = {
        "report_id": str(uuid.uuid4()),
        "session_id": session_id,
        "technical_score": round(avg_technical, 2),
        "communication_score": round(avg_communication, 2) if avg_communication is not None else None,
        "pacing_score": round(avg_pacing, 2) if avg_pacing is not None else None,
        "composite_score": composite,
        "weak_topics": list({
            concept
            for t in turns
            for concept in t.get("missing_concepts", [])
        }),
        "jd_coverage": jd_coverage,
        "improvement_plan_text": improvement_plan,
        "langsmith_trace_url": "",
        "created_at": utcnow_iso(),
    }

    async with get_db() as db:
        await update_session_end(db, session_id, utcnow_iso(), composite)
        await insert_report(db, report)

    await websocket.send_json({
        "type": "report_ready",
        "report": report,
        "turns": turns,
    })

    logger.info(f"Session finalized: {session_id}")