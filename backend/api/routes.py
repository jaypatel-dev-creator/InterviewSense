import uuid
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import Response
from schemas.session import SessionCreateRequest, SessionResponse
from schemas.report import ReportResponse
from schemas.turn import TurnResponse, SpeechMetrics
from db.database import get_db
from db.queries import (
    insert_session,
    get_all_sessions,
    get_session_by_id,
    get_turns_by_session,
    get_report_by_session,
    delete_session,
    delete_all_sessions,
)
from core.exceptions import SessionNotFoundException, ReportNotFoundException
from core.config import get_settings
from core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Sessions ---

@router.post("/sessions", response_model=SessionResponse)
async def create_session(payload: SessionCreateRequest):
    session_id = str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "candidate_name": payload.candidate_name,
        "domain": payload.domain.value,
        "difficulty": payload.difficulty.value,
        "question_count": payload.question_count,
        "jd_text": payload.jd_text,
        "start_time": utcnow_iso(),
    }
    async with await get_db() as db:
        await insert_session(db, session)
    logger.info(f"Session created: {session_id}")
    return SessionResponse(**session)


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions():
    async with await get_db() as db:
        sessions = await get_all_sessions(db)
    return [SessionResponse(**s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    async with await get_db() as db:
        session = await get_session_by_id(db, session_id)
    if session is None:
        raise SessionNotFoundException(session_id)
    return SessionResponse(**session)


@router.delete("/sessions", status_code=204)
async def remove_all_sessions():
    async with await get_db() as db:
        await delete_all_sessions(db)


@router.delete("/sessions/{session_id}", status_code=204)
async def remove_session(session_id: str):
    async with await get_db() as db:
        deleted = await delete_session(db, session_id)
    if not deleted:
        raise SessionNotFoundException(session_id)


# --- Turns ---

@router.get("/sessions/{session_id}/turns", response_model=list[TurnResponse])
async def get_turns(session_id: str):
    async with await get_db() as db:
        session = await get_session_by_id(db, session_id)
        if session is None:
            raise SessionNotFoundException(session_id)
        turns = await get_turns_by_session(db, session_id)
    return [
        TurnResponse(
            **{**t, "speech_metrics": SpeechMetrics(**t["speech_metrics"])}
        )
        for t in turns
    ]


# --- Reports ---

@router.get("/sessions/{session_id}/report", response_model=ReportResponse)
async def get_report(session_id: str):
    async with await get_db() as db:
        session = await get_session_by_id(db, session_id)
        if session is None:
            raise SessionNotFoundException(session_id)
        report = await get_report_by_session(db, session_id)
    if report is None:
        raise ReportNotFoundException(session_id)
    return ReportResponse(**report)


# --- TTS Proxy ---

@router.post("/tts")
async def text_to_speech(payload: dict):
    from elevenlabs.client import AsyncElevenLabs
    settings = get_settings()

    client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)

    audio_bytes = b""
    async for chunk in client.text_to_speech.convert(
        text=payload.get("text", ""),
        voice_id=settings.elevenlabs_voice_id,
        model_id="eleven_flash_v2_5",
        output_format="mp3_44100_128",
    ):
        audio_bytes += chunk

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline"},
    )


# --- Health ---

@router.get("/health")
async def health():
    return {"status": "ok", "service": "InterviewSense"}