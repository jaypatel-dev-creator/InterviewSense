from fastapi import Request
from fastapi.responses import JSONResponse

from core.logging import get_logger

logger = get_logger(__name__)


# Base exception class
class InterviewSenseException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# Domain-specific exceptions
class SessionNotFoundException(InterviewSenseException):
    def __init__(self, session_id: str):
        super().__init__(
            message=f"Session '{session_id}' not found.",
            status_code=404,
        )


class TranscriptionException(InterviewSenseException):
    def __init__(self, message: str = "Transcription failed."):
        super().__init__(message=message, status_code=500)


class AgentException(InterviewSenseException):
    def __init__(self, message: str = "Agent processing failed."):
        super().__init__(message=message, status_code=500)


class ReportNotFoundException(InterviewSenseException):
    def __init__(self, session_id: str):
        super().__init__(
            message=f"Report for session '{session_id}' not found.",
            status_code=404,
        )


class TTSException(InterviewSenseException):
    def __init__(self, message: str = "Text-to-speech failed."):
        super().__init__(message=message, status_code=500)


# Exception handlers
async def interviewsense_exception_handler(
    request: Request,
    exc: InterviewSenseException,
) -> JSONResponse:
    if exc.status_code >= 500:
        logger.error(
            f"{exc.__class__.__name__} on {request.method} {request.url.path}: {exc.message}",
            exc_info=True,
        )
    else:
        logger.warning(
            f"{exc.__class__.__name__} on {request.method} {request.url.path}: {exc.message}"
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
        },
    )


async def generic_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred.",
        },
    )