import os
from core.logging import get_logger

logger = get_logger(__name__)


def setup_langsmith(settings) -> None:
    """
    Sets LangSmith environment variables from settings.
    Must be called before any LangChain/LangGraph calls.
    LangSmith auto-instruments all LangChain calls when
    LANGCHAIN_TRACING_V2=true is set.
    """
    os.environ["LANGCHAIN_TRACING_V2"] = settings.langchain_tracing_v2
    os.environ["LANGCHAIN_ENDPOINT"] = settings.langchain_endpoint
    os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project

    logger.info(
        f"LangSmith configured — project: {settings.langchain_project}, "
        f"tracing: {settings.langchain_tracing_v2}"
    )


def get_trace_url(run_id: str) -> str:
    """
    Builds a LangSmith trace URL for a given run ID.
    Used to attach trace links to session reports.
    """
    return f"https://smith.langchain.com/public/{run_id}/r"