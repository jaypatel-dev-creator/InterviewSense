from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from core.config import get_settings
from core.logging import get_logger
from core.exceptions import AgentException
from agents.state import SessionState
from agents.llm import set_llm
from agents.speech_analytics import speech_analytics_node
from agents.evaluator_router import evaluator_router_node
from agents.report_generator import report_generator_node

logger = get_logger(__name__)

_initialized: bool = False


def compile_graph() -> None:
    global _initialized
    settings = get_settings()

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        google_api_key=settings.google_api_key,
        temperature=0.7,
    )
    set_llm(llm)

    _initialized = True
    logger.info("InterviewSense agent graph compiled.")


def should_generate_report(state: SessionState) -> str:
    if state.get("interview_complete", False):
        return "report_generator"
    return "evaluator_router"


def build_graph():
    if not _initialized:
        raise AgentException("Graph not initialized. Call compile_graph() on startup.")

    graph = StateGraph(SessionState)

    graph.add_node("speech_analytics", speech_analytics_node)
    graph.add_node("evaluator_router", evaluator_router_node)
    graph.add_node("report_generator", report_generator_node)

    graph.set_entry_point("speech_analytics")

    graph.add_conditional_edges(
        "speech_analytics",
        should_generate_report,
        {
            "evaluator_router": "evaluator_router",
            "report_generator": "report_generator",
        },
    )

    graph.add_edge("evaluator_router", END)
    graph.add_edge("report_generator", END)

    return graph.compile()