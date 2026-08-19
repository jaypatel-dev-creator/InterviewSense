import logging
import sys


def setup_logging(app_env: str = "development") -> None:
    log_level = logging.DEBUG if app_env == "development" else logging.INFO

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Silence noisy third-party loggers
    for noisy in [
        "httpx",
        "httpcore",
        "aiosqlite",
        "urllib3",
        "opentelemetry",
        "google.auth",
        "google.auth.transport",
        "faster_whisper",
        "numba",
        "audioread",
        "librosa",
        # Groq HTTP client dumps raw binary audio bytes at DEBUG level
        "groq._base_client",
        "groq",
        # ElevenLabs and google-genai HTTP noise
        "elevenlabs",
        "google_genai",
        "google.ai.generativelanguage",
    ]:
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)