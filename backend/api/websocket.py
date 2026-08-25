import uuid
import json
import numpy as np
from datetime import datetime, timezone
from fastapi import WebSocket, WebSocketDisconnect
from agents.orchestrator import build_graph
from agents.state import SessionState
from audio.processor import process_audio_chunk
from db.database import get_db
from db.queries import insert_turn, update_session_end, insert_report
from prompts.evaluator_router import build_first_question_prompt
from prompts.jd_extractor import build_jd_extractor_prompt
from domains.topics import SEED_TOPICS, Domain, Difficulty
from agents.llm import get_llm
from core.logging import get_logger
from core.exceptions import TranscriptionException, AgentException

logger = get_logger(__name__)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_text(response) -> str:
    """
    langchain-google-genai returns response.content as a list of dicts:
    [{'type': 'text', 'text': '...', 'extras': {'signature': '...'}}]
    This is the standard format for gemini-3.x models via langchain-google-genai.
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
        # JD extraction failure is non-fatal — session continues without JD grounding
        logger.warning(f"JD skill extraction failed: {e}", exc_info=True)
        return []


async def generate_first_question(
    domain: str,
    difficulty: str,
    jd_skills: list[str],
) -> str:
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
        # First question generation failure degrades the entire session — log as error
        logger.error(f"First question generation failed: {e}", exc_info=True)
        return f"Tell me about your experience with {domain.replace('_', ' ')}."


def _compute_pacing_score(wpm: float) -> float:
    """
    Converts WPM to a 0–10 score.
    Ideal interview pace is 120–160 wpm — score 10.
    Outside that range score degrades linearly.
    Below 80 or above 220 → floor at 2.0 (never zero — some speech happened).
    Returns 0.0 if wpm is 0 (no speech detected).
    """
    if wpm <= 0:
        return 0.0
    if 120 <= wpm <= 160:
        return 10.0
    if wpm < 120:
        # 80 wpm → 2.0, 120 wpm → 10.0
        score = 2.0 + (wpm - 80) * (8.0 / 40)
    else:
        # 160 wpm → 10.0, 220 wpm → 2.0
        score = 10.0 - (wpm - 160) * (8.0 / 60)
    return round(max(2.0, min(10.0, score)), 2)


def _compute_communication_score(energy_level: float) -> float:
    """
    Converts librosa RMS energy to a 0–10 communication score.
    energy_level is raw RMS (typically 0.0 to ~0.15 for speech).
    Rescales to 0–10 with a cap at 0.10 RMS = 10.0.
    More meaningful than confidence_proxy which Groq hardcodes to 1.0.
    """
    if energy_level <= 0:
        return 0.0
    score = (energy_level / 0.10) * 10.0
    return round(min(10.0, score), 2)


async def handle_interview_websocket(
    websocket: WebSocket,
    session_id: str,
    domain: str,
    difficulty: str,
    question_count: int,
    jd_text: str | None,
    candidate_name: str | None,
):
    # --- Validate domain and difficulty before accepting the connection ---
    # Reject with close code 1008 (policy violation) so the frontend gets a
    # clear signal rather than silently running a session with bad seed topics.
    valid_domains = {d.value for d in Domain}
    valid_difficulties = {d.value for d in Difficulty}

    if domain not in valid_domains:
        logger.warning(f"Invalid domain rejected at WebSocket connect: '{domain}'")
        await websocket.close(code=1008, reason=f"Invalid domain: '{domain}'")
        return

    if difficulty not in valid_difficulties:
        logger.warning(f"Invalid difficulty rejected at WebSocket connect: '{difficulty}'")
        await websocket.close(code=1008, reason=f"Invalid difficulty: '{difficulty}'")
        return

    await websocket.accept()
    logger.info(f"WebSocket connected — session: {session_id}")

    try:
        graph = build_graph()

        jd_skills = await extract_jd_skills(jd_text or "")
        logger.info(f"JD skills extracted: {jd_skills}")

        first_question = await generate_first_question(domain, difficulty, jd_skills)

        state: SessionState = {
            "session_id": session_id,
            "candidate_name": candidate_name,
            "domain": domain,
            "difficulty": difficulty,
            "question_count": question_count,
            "jd_text": jd_text or "",
            "jd_skills": jd_skills,
            "current_question": first_question,
            "current_question_number": 1,
            "turns": [],
            "messages": [],
            "interview_complete": False,
            "improvement_plan_text": "",
            # Required by SessionState TypedDict — populated by report_generator_node
            # at session end. Empty string here satisfies the contract without
            # affecting any node that runs before _finalize_session.
        }

        await websocket.send_json({
            "type": "question",
            "question": first_question,
            "question_number": 1,
            "question_count": question_count,
        })
        logger.info("First question sent to frontend.")

        while True:
            message = await websocket.receive()

            # --- Text fallback ---
            if "text" in message:
                data = json.loads(message["text"])

                if data.get("type") == "text_answer":
                    if state.get("interview_complete"):
                        continue
                    answer_text = data.get("text", "")
                    await _process_answer(
                        websocket=websocket,
                        state=state,
                        graph=graph,
                        answer_transcript=answer_text,
                        speech_metrics={},
                        session_id=session_id,
                    )

                elif data.get("type") == "end_interview":
                    await _finalize_session(websocket, state, session_id)
                    return  # socket closed by frontend after report_ready — stop receiving

                elif data.get("type") == "repeat_question":
                    await websocket.send_json({
                        "type": "question",
                        "question": state["current_question"],
                        "question_number": state["current_question_number"],
                        "question_count": question_count,
                    })

                elif data.get("type") == "skip_question":
                    # Record skipped turn so breakdown shows it and score is penalised
                    skipped_turn = {
                        "turn_id": str(uuid.uuid4()),
                        "question_text": state["current_question"],
                        "answer_transcript": "",
                        "correctness_score": None,
                        "missing_concepts": [],
                        "strengths": [],
                        "next_question_type": None,
                        "difficulty_adjustment": None,
                        "speech_metrics": {},
                        "timestamp": utcnow_iso(),
                        "skipped": True,
                    }
                    state["turns"] = state["turns"] + [skipped_turn]

                    # Persist skipped turn to DB so session history shows it.
                    # _process_answer handles insert_turn for answered turns,
                    # but skips bypass _process_answer entirely — without this,
                    # the DB turns table has no record of skipped questions and
                    # the history sidebar shows fewer questions than occurred.
                    async with await get_db() as db:
                        await insert_turn(db, {
                            **skipped_turn,
                            "session_id": session_id,
                        })

                    state["current_question_number"] += 1
                    if state["current_question_number"] > question_count:
                        await _finalize_session(websocket, state, session_id)
                        break
                    # Generate next question directly via LLM — do NOT run the
                    # full graph here. The graph runs evaluator-router which
                    # requires at least one turn in state. Skip has no answer
                    # to evaluate, so invoking the graph throws when turns=[].
                    next_question = await generate_first_question(
                        domain=state["domain"],
                        difficulty=state["difficulty"],
                        jd_skills=state["jd_skills"],
                    )
                    state["current_question"] = next_question
                    await websocket.send_json({
                        "type": "question",
                        "question": next_question,
                        "question_number": state["current_question_number"],
                        "question_count": question_count,
                    })

            # --- Audio chunk ---
            elif "bytes" in message:
                if state.get("interview_complete"):
                    continue

                raw_bytes = message["bytes"]
                audio_chunk = np.frombuffer(raw_bytes, dtype=np.float32)

                result = await process_audio_chunk(audio_chunk)
                transcript = result["transcript"]
                speech_metrics = result["speech_metrics"]

                await websocket.send_json({
                    "type": "transcript_update",
                    "text": transcript["text"],
                    "speech_metrics": speech_metrics,
                })

                if transcript["text"].strip():
                    await _process_answer(
                        websocket=websocket,
                        state=state,
                        graph=graph,
                        answer_transcript=transcript["text"],
                        speech_metrics=speech_metrics,
                        session_id=session_id,
                    )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected — session: {session_id}")

    except TranscriptionException as e:
        # Groq STT failed — session cannot continue without a transcript.
        # Notify the frontend with a typed error code so the UI can show
        # a specific message ("Speech recognition failed, please try again")
        # rather than a generic crash screen.
        logger.error(f"Transcription failed — session {session_id}: {e.message}")
        try:
            await websocket.send_json({
                "type": "error",
                "error_code": "TRANSCRIPTION_FAILED",
                "message": e.message,
            })
        except Exception:
            pass

    except AgentException as e:
        # LLM agent call failed (evaluator-router or report-generator).
        # Frontend can surface "Evaluation failed, please retry" specifically.
        logger.error(f"Agent failed — session {session_id}: {e.message}")
        try:
            await websocket.send_json({
                "type": "error",
                "error_code": "AGENT_FAILED",
                "message": e.message,
            })
        except Exception:
            pass

    except Exception as e:
        # Catch-all for anything genuinely unexpected — log with full traceback.
        logger.error(f"Unhandled WebSocket error — session {session_id}: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "error_code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
            })
        except Exception:
            pass


async def _process_answer(
    websocket: WebSocket,
    state: SessionState,
    graph,
    answer_transcript: str,
    speech_metrics: dict,
    session_id: str,
):
    turn_id = str(uuid.uuid4())

    new_turn = {
        "turn_id": turn_id,
        "question_text": state["current_question"],
        "answer_transcript": answer_transcript,
        "speech_metrics": speech_metrics,
        "correctness_score": None,
        "missing_concepts": [],
        "strengths": [],
        "next_question_type": None,
        "difficulty_adjustment": None,
        "timestamp": utcnow_iso(),
    }

    state["turns"] = state["turns"] + [new_turn]

    logger.info(f"Running agent graph for turn {len(state['turns'])}")
    result = await graph.ainvoke(state)
    state.update(result)
    logger.info("Agent graph complete.")

    evaluated_turn = state["turns"][-1]

    async with await get_db() as db:
        await insert_turn(db, {
            **evaluated_turn,
            "session_id": session_id,
        })

    if state.get("interview_complete"):
        await _finalize_session(websocket, state, session_id)
    else:
        await websocket.send_json({
            "type": "question",
            "question": state["current_question"],
            "question_number": state["current_question_number"],
            "question_count": state["question_count"],
            "evaluation": {
                "correctness_score": evaluated_turn.get("correctness_score"),
                "strengths": evaluated_turn.get("strengths", []),
                "missing_concepts": evaluated_turn.get("missing_concepts", []),
            },
        })


async def _finalize_session(
    websocket: WebSocket,
    state: SessionState,
    session_id: str,
):
    logger.info(f"Finalizing session: {session_id}")

    # 0-turn guard — user ended the session before answering or skipping anything.
    # report_generator_node raises AgentException on empty turns, so bypass the
    # graph entirely and emit a minimal report so the frontend doesn't hang.
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
            "improvement_plan_text": "No questions were answered in this session.",
            "langsmith_trace_url": "",
            "created_at": utcnow_iso(),
        }
        async with await get_db() as db:
            await update_session_end(db, session_id, utcnow_iso(), 0.0)
            await insert_report(db, empty_report)
        await websocket.send_json({
            "type": "report_ready",
            "report": empty_report,
            "turns": [],
        })
        logger.info(f"Empty report sent for session: {session_id}")
        return

    result = await build_graph().ainvoke({**state, "interview_complete": True})
    improvement_plan = result.get("improvement_plan_text", "") or "No improvement plan was generated for this session."

    turns = state["turns"]
    question_count = state["question_count"]

    # Technical score — avg correctness from Gemini evaluator (0–10).
    # Divide by question_count (not answered count) so skipped questions
    # are penalised as zeros, not excluded.
    technical_scores = [
        t.get("correctness_score", 0.0)
        for t in turns
        if t.get("correctness_score") is not None
    ]
    if technical_scores:
        avg_technical = sum(technical_scores) / question_count
    else:
        avg_technical = 0.0

    # Communication score — avg RMS energy rescaled to 0–10.
    # Only meaningful when majority of questions had voice answers.
    # If fewer than half questions have audio, set to None (shown as N/A).
    audio_turns = [
        t for t in turns
        if t.get("speech_metrics", {}).get("energy_level", 0.0) > 0
    ]
    if len(audio_turns) >= question_count / 2:
        energy_scores = [
            _compute_communication_score(t["speech_metrics"]["energy_level"])
            for t in audio_turns
        ]
        avg_communication = sum(energy_scores) / len(energy_scores)
    else:
        avg_communication = None  # insufficient audio data — show N/A

    # Pacing score — WPM converted to 0–10 (ideal 120–160 wpm = 10).
    # Same threshold — N/A if fewer than half questions had voice answers.
    wpm_turns = [
        t for t in turns
        if t.get("speech_metrics", {}).get("wpm", 0.0) > 0
    ]
    if len(wpm_turns) >= question_count / 2:
        wpm_scores = [
            _compute_pacing_score(t["speech_metrics"]["wpm"])
            for t in wpm_turns
        ]
        avg_pacing = sum(wpm_scores) / len(wpm_scores)
    else:
        avg_pacing = None  # insufficient audio data — show N/A

    # Composite — technical 60%, communication 25%, pacing 15%.
    # When communication or pacing is N/A, redistribute their weight to technical.
    if avg_communication is not None and avg_pacing is not None:
        composite = round(avg_technical * 0.60 + avg_communication * 0.25 + avg_pacing * 0.15, 2)
    elif avg_communication is not None:
        composite = round(avg_technical * 0.75 + avg_communication * 0.25, 2)
    elif avg_pacing is not None:
        composite = round(avg_technical * 0.85 + avg_pacing * 0.15, 2)
    else:
        composite = round(avg_technical, 2)

    report_id = str(uuid.uuid4())
    report = {
        "report_id": report_id,
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
        "improvement_plan_text": improvement_plan,
        "langsmith_trace_url": "",
        "created_at": utcnow_iso(),
    }

    async with await get_db() as db:
        await update_session_end(db, session_id, utcnow_iso(), composite)
        await insert_report(db, report)

    await websocket.send_json({
        "type": "report_ready",
        "report": report,
        "turns": turns,  # full evaluated turn objects for frontend radar + breakdown
    })

    logger.info(f"Session finalized: {session_id}")