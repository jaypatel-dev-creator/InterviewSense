import uuid
import json
import numpy as np
from datetime import datetime, timezone
from fastapi import WebSocket, WebSocketDisconnect
from agents.orchestrator import build_graph
from agents.state import SessionState
from audio.processor import process_audio_chunk
from audio.vad import detect_speech_chunks
from db.database import get_db
from db.queries import insert_turn, update_session_end, insert_report
from prompts.evaluator_router import build_first_question_prompt
from prompts.jd_extractor import build_jd_extractor_prompt
from domains.topics import SEED_TOPICS, Domain
from agents.orchestrator import get_llm
from core.logging import get_logger
from core.exceptions import AgentException

logger = get_logger(__name__)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def extract_jd_skills(jd_text: str) -> list[str]:
    if not jd_text or not jd_text.strip():
        return []
    llm = get_llm()
    prompt = build_jd_extractor_prompt(jd_text)
    try:
        response = await llm.ainvoke(prompt)
        content = response.content.strip()
        # Strip markdown fences if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        skills = json.loads(content.strip())
        return skills if isinstance(skills, list) else []
    except Exception as e:
        logger.warning(f"JD skill extraction failed: {e}")
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
        response = await llm.ainvoke(prompt)
        return response.content.strip()
    except Exception as e:
        logger.warning(f"First question generation failed: {e}")
        return f"Tell me about your experience with {domain.replace('_', ' ')}."


async def handle_interview_websocket(
    websocket: WebSocket,
    session_id: str,
    domain: str,
    difficulty: str,
    question_count: int,
    jd_text: str | None,
    candidate_name: str | None,
):
    await websocket.accept()
    logger.info(f"WebSocket connected — session: {session_id}")

    graph = build_graph()

    # Extract JD skills if provided
    jd_skills = await extract_jd_skills(jd_text or "")

    # Generate first question
    first_question = await generate_first_question(domain, difficulty, jd_skills)

    # Initialize session state
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
    }

    # Send first question to frontend
    await websocket.send_json({
        "type": "question",
        "question": first_question,
        "question_number": 1,
        "question_count": question_count,
    })

    try:
        while True:
            message = await websocket.receive()

            # --- Text fallback ---
            if "text" in message:
                data = json.loads(message["text"])

                if data.get("type") == "text_answer":
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
                    break

                elif data.get("type") == "repeat_question":
                    await websocket.send_json({
                        "type": "question",
                        "question": state["current_question"],
                        "question_number": state["current_question_number"],
                        "question_count": question_count,
                    })

            # --- Audio chunk ---
            elif "bytes" in message:
                raw_bytes = message["bytes"]
                audio_chunk = np.frombuffer(raw_bytes, dtype=np.float32)

                # Process audio — parallel Whisper + librosa
                result = await process_audio_chunk(audio_chunk)
                transcript = result["transcript"]
                speech_metrics = result["speech_metrics"]

                # Send live transcript update
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
    except Exception as e:
        logger.error(f"WebSocket error — session {session_id}: {e}", exc_info=True)
        await websocket.send_json({"type": "error", "message": str(e)})


async def _process_answer(
    websocket: WebSocket,
    state: SessionState,
    graph,
    answer_transcript: str,
    speech_metrics: dict,
    session_id: str,
):
    turn_id = str(uuid.uuid4())

    # Add turn to state
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
    state["turns"].append(new_turn)

    # Run agent graph
    result = await graph.ainvoke(state)
    state.update(result)

    # Persist turn to DB
    async with await get_db() as db:
        await insert_turn(db, {
            **new_turn,
            "session_id": session_id,
            "correctness_score": state["turns"][-1].get("correctness_score"),
            "speech_metrics": state["turns"][-1].get("speech_metrics", {}),
            "next_question_type": state["turns"][-1].get("next_question_type"),
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
                "correctness_score": state["turns"][-1].get("correctness_score"),
                "strengths": state["turns"][-1].get("strengths", []),
                "missing_concepts": state["turns"][-1].get("missing_concepts", []),
            },
        })


async def _finalize_session(
    websocket: WebSocket,
    state: SessionState,
    session_id: str,
):
    logger.info(f"Finalizing session: {session_id}")

    # Run report generator
    result = await build_graph().ainvoke({**state, "interview_complete": True})
    improvement_plan = result.get("improvement_plan_text", "")

    # Compute scores
    turns = state["turns"]
    technical_scores = [
        t.get("correctness_score", 0.0)
        for t in turns
        if t.get("correctness_score") is not None
    ]
    speech_scores = [
        t.get("speech_metrics", {}).get("confidence_proxy", 0.0)
        for t in turns
    ]
    avg_technical = sum(technical_scores) / len(technical_scores) if technical_scores else 0.0
    avg_speech = sum(speech_scores) / len(speech_scores) if speech_scores else 0.0
    composite = round((avg_technical * 0.6 + avg_speech * 10 * 0.4), 2)

    report_id = str(uuid.uuid4())
    report = {
        "report_id": report_id,
        "session_id": session_id,
        "technical_score": round(avg_technical, 2),
        "communication_score": round(avg_speech * 10, 2),
        "speech_score": round(avg_speech * 10, 2),
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
    })

    logger.info(f"Session finalized: {session_id}")
