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
from domains.topics import SEED_TOPICS
from agents.llm import get_llm
from core.logging import get_logger

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
        question = response.content.strip()
        logger.info(f"First question generated: {question[:80]}")
        return question
    except Exception as e:
        logger.error(f"First question generation failed: {e}", exc_info=True)
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
                    break

                elif data.get("type") == "repeat_question":
                    await websocket.send_json({
                        "type": "question",
                        "question": state["current_question"],
                        "question_number": state["current_question_number"],
                        "question_count": question_count,
                    })

                elif data.get("type") == "skip_question":
                    state["current_question_number"] += 1
                    if state["current_question_number"] > question_count:
                        await _finalize_session(websocket, state, session_id)
                        break

            # --- Audio chunk ---
            elif "bytes" in message:
                # Guard — don't process audio after interview is complete.
                # Silence detection can fire one extra time after the last
                # answer, sending a phantom chunk that creates turn 6 on a
                # 5-question session.
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
    except Exception as e:
        logger.error(f"WebSocket error — session {session_id}: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
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

    # Don't append to state["turns"] before graph.ainvoke — the graph
    # manages turns via the _replace_turns reducer. Appending here then
    # letting the graph also return turns causes double-accumulation and
    # drifts the question counter. Pass the new turn via state directly.
    state["turns"] = state["turns"] + [new_turn]

    logger.info(f"Running agent graph for turn {len(state['turns'])}")
    result = await graph.ainvoke(state)
    state.update(result)
    logger.info("Agent graph complete.")

    # Use the evaluated turn from state for DB insert
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

    result = await build_graph().ainvoke({**state, "interview_complete": True})
    improvement_plan = result.get("improvement_plan_text", "")

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