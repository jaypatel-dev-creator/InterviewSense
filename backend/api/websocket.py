import uuid
import json
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from agents.orchestrator import get_graph
from agents.state import SessionState
from audio.processor import process_audio_chunk
from db.database import get_db
from db.queries import insert_turn
from domains.topics import Domain, Difficulty
from core.logging import get_logger
from core.exceptions import TranscriptionException, AgentException
from services.session_service import (
    utcnow_iso,
    extract_jd_skills,
    generate_first_question,
    build_conversation_summary_line,
    finalize_session,
)

logger = get_logger(__name__)


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
        graph = get_graph()

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
            "conversation_summary": "",
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
                    await _process_answer(
                        websocket=websocket,
                        state=state,
                        graph=graph,
                        answer_transcript=data.get("text", ""),
                        speech_metrics={},
                        session_id=session_id,
                    )

                elif data.get("type") == "end_interview":
                    await finalize_session(websocket, state, session_id, graph)
                    return

                elif data.get("type") == "repeat_question":
                    await websocket.send_json({
                        "type": "question",
                        "question": state["current_question"],
                        "question_number": state["current_question_number"],
                        "question_count": question_count,
                    })

                elif data.get("type") == "skip_question":
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

                    async with get_db() as db:
                        await insert_turn(db, {**skipped_turn, "session_id": session_id})

                    state["current_question_number"] += 1
                    if state["current_question_number"] > question_count:
                        await finalize_session(websocket, state, session_id, graph)
                        break

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

                audio_chunk = np.frombuffer(message["bytes"], dtype=np.float32)
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
    new_turn = {
        "turn_id": str(uuid.uuid4()),
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

    # Update rolling conversation summary via session_service helper
    summary_line = build_conversation_summary_line(state, evaluated_turn)
    state["conversation_summary"] = (
        state.get("conversation_summary", "") + "\n" + summary_line
    ).strip()

    async with get_db() as db:
        await insert_turn(db, {**evaluated_turn, "session_id": session_id})

    if state.get("interview_complete"):
        await finalize_session(websocket, state, session_id, graph)
        return  # exit _process_answer — prevents while True loop from calling receive() on closed socket
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