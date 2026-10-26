import uuid
import json
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from agents.orchestrator import get_graph
from agents.state import SessionState
from audio.processor import process_audio_chunk
from db.database import get_db
from db.queries import insert_turn, get_session_by_id
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


async def _send_error(websocket: WebSocket, error_code: str, message: str) -> None:
    """
    Sends a typed error message to the client without ever raising.
    If the client has already disconnected, the send fails quietly instead
    of turning a recoverable error into an unhandled one.
    """
    try:
        await websocket.send_json({
            "type": "error",
            "error_code": error_code,
            "message": message,
        })
    except Exception:
        logger.debug("Could not deliver error message — client connection is closed.")


async def handle_interview_websocket(websocket: WebSocket, session_id: str):
    # Session config comes from the database, not the WebSocket URL. It was already
    # validated by SessionCreateRequest when the session was created via REST.
    async with get_db() as db:
        session = await get_session_by_id(db, session_id)

    if session is None:
        logger.warning(f"WebSocket rejected — session not found: '{session_id}'")
        await websocket.close(code=1008, reason="Session not found")
        return

    domain = session["domain"]
    difficulty = session["difficulty"]
    question_count = session["question_count"]
    jd_text = session["jd_text"]
    candidate_name = session["candidate_name"]

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

            # receive() returns a disconnect message instead of raising. Without
            # this check the loop calls receive() again and fails with a RuntimeError.
            if message.get("type") == "websocket.disconnect":
                logger.info(f"WebSocket disconnected — session: {session_id}")
                return

            # Per-message error handling: a bad message or a failed Groq/Gemini call
            # is reported to the client and the session keeps running. Anything not
            # caught here is unexpected and still ends the session via the outer handlers.
            try:
                # --- Text fallback ---
                if "text" in message:
                    try:
                        data = json.loads(message["text"])
                    except json.JSONDecodeError:
                        data = None

                    if not isinstance(data, dict):
                        await _send_error(
                            websocket,
                            "INVALID_MESSAGE",
                            "Message must be a valid JSON object.",
                        )
                        continue

                    if data.get("type") == "text_answer":
                        if state.get("interview_complete"):
                            continue

                        answer_text = data.get("text")
                        if not isinstance(answer_text, str) or not answer_text.strip():
                            await _send_error(
                                websocket,
                                "INVALID_MESSAGE",
                                "Answer cannot be empty.",
                            )
                            continue

                        await _process_answer(
                            websocket=websocket,
                            state=state,
                            graph=graph,
                            answer_transcript=answer_text.strip(),
                            speech_metrics={},
                            session_id=session_id,
                        )
                        if state.get("interview_complete"):
                            return

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
                            return  # changed from break → return to fully exit handler

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

                    raw_audio = message["bytes"]

                    # float32 samples are 4 bytes each — reject empty or truncated frames
                    if not raw_audio or len(raw_audio) % 4 != 0:
                        await _send_error(
                            websocket,
                            "INVALID_MESSAGE",
                            "Invalid audio data received.",
                        )
                        continue

                    audio_chunk = np.frombuffer(raw_audio, dtype=np.float32)
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
                        if state.get("interview_complete"):
                            return

            except TranscriptionException as e:
                logger.error(f"Transcription failed — session {session_id}: {e.message}", exc_info=True)
                await _send_error(
                    websocket,
                    "TRANSCRIPTION_FAILED",
                    "Transcription failed. Please try again.",
                )

            except AgentException as e:
                logger.error(f"Agent failed — session {session_id}: {e.message}", exc_info=True)
                await _send_error(
                    websocket,
                    "AGENT_FAILED",
                    "Something went wrong while processing your answer. Please try again.",
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected — session: {session_id}")

    except AgentException as e:
        logger.error(f"Agent failed — session {session_id}: {e.message}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "error_code": "AGENT_FAILED",
                "message": "Something went wrong while processing your answer. Please try again.",
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
        "skipped": False,
    }

    logger.info(f"Running agent graph for turn {len(state['turns']) + 1}")
    # Run the graph on a copy of the state so a failed run leaves the real state
    # untouched. The unscored turn is only committed once the graph succeeds.
    result = await graph.ainvoke({**state, "turns": state["turns"] + [new_turn]})
    state.update(result)
    logger.info("Agent graph complete.")

    evaluated_turn = state["turns"][-1]

    summary_line = build_conversation_summary_line(state, evaluated_turn)
    state["conversation_summary"] = (
        state.get("conversation_summary", "") + "\n" + summary_line
    ).strip()

    async with get_db() as db:
        await insert_turn(db, {**evaluated_turn, "session_id": session_id})

    if state.get("interview_complete"):
        await finalize_session(websocket, state, session_id, graph)
        return  # caller checks state["interview_complete"] and returns from the while loop
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