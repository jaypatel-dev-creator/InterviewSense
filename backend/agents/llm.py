from langchain_google_genai import ChatGoogleGenerativeAI
from core.logging import get_logger
from core.exceptions import AgentException

logger = get_logger(__name__)

_llm: ChatGoogleGenerativeAI | None = None


# Called from: orchestrator.py (compile_graph, at startup)
def set_llm(llm: ChatGoogleGenerativeAI) -> None:
    global _llm
    _llm = llm


# Called from: evaluator_router.py, report_generator.py, session_service.py (extract_jd_skills, generate_first_question)
def get_llm() -> ChatGoogleGenerativeAI:
    if _llm is None:
        raise AgentException("LLM not initialized. Call compile_graph() on startup.")
    return _llm