import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from core.logging import setup_logging, get_logger
from core.exceptions import (
    InterviewSenseException,
    interviewsense_exception_handler,
    generic_exception_handler,
)
from core.langsmith import setup_langsmith
from api.routes import router
from api.websocket import handle_interview_websocket
from db.database import init_db_path, get_db
from db.models import create_tables
from agents.orchestrator import compile_graph
from audio.transcriber import load_whisper
from audio.vad import load_vad

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    settings = get_settings()
    setup_logging(settings.app_env)
    logger.info("Starting InterviewSense...")

    # LangSmith
    setup_langsmith(settings)

    # Database
    init_db_path()
    async with await get_db() as db:
        await create_tables(db)
    logger.info("Database ready.")

    # Audio models — loaded once, reused across all sessions
    load_whisper()
    load_vad()
    logger.info("Audio models loaded.")

    # LangGraph agent graph
    compile_graph()

    logger.info("InterviewSense is ready.")
    yield

    # --- Shutdown ---
    logger.info("Shutting down InterviewSense...")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="InterviewSense",
        description="Voice-native AI interview coach",
        version="1.0.0",
        docs_url="/docs" if settings.app_env == "development" else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(InterviewSenseException, interviewsense_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    app.include_router(router, prefix="/api")

    return app


app = create_app()


@app.websocket("/ws/interview/{session_id}")
async def interview_websocket(
    websocket: WebSocket,
    session_id: str,
    domain: str = Query(...),
    difficulty: str = Query(...),
    question_count: int = Query(default=5),
    jd_text: str = Query(default=None),
    candidate_name: str = Query(default=None),
):
    await handle_interview_websocket(
        websocket=websocket,
        session_id=session_id,
        domain=domain,
        difficulty=difficulty,
        question_count=question_count,
        jd_text=jd_text,
        candidate_name=candidate_name,
    )
