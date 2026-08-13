from enum import Enum


class Domain(str, Enum):
    DSA = "dsa"
    SYSTEM_DESIGN = "system_design"
    BACKEND_ENGINEERING = "backend_engineering"
    AI_ML = "ai_ml"
    ML_SYSTEM_DESIGN = "ml_system_design"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


SEED_TOPICS: dict[str, list[str]] = {
    Domain.DSA: [
        "arrays and strings",
        "linked lists",
        "stacks and queues",
        "binary trees and BST",
        "graphs and BFS/DFS",
        "dynamic programming",
        "recursion and backtracking",
        "sorting and searching",
        "heaps and priority queues",
        "time and space complexity",
    ],
    Domain.SYSTEM_DESIGN: [
        "scalability and load balancing",
        "database design and sharding",
        "caching strategies",
        "message queues and event-driven architecture",
        "API design and rate limiting",
        "microservices vs monolith",
        "CAP theorem and consistency models",
        "CDN and distributed storage",
        "monitoring and observability",
        "fault tolerance and disaster recovery",
    ],
    Domain.BACKEND_ENGINEERING: [
        "REST API design principles",
        "authentication and authorization",
        "database indexing and query optimization",
        "async programming and concurrency",
        "error handling and logging",
        "containerization and deployment",
        "WebSockets and real-time communication",
        "background tasks and job queues",
        "testing strategies",
        "API versioning and documentation",
    ],
    Domain.AI_ML: [
        "supervised vs unsupervised learning",
        "model evaluation metrics",
        "overfitting and regularization",
        "embeddings and vector representations",
        "transformer architecture and attention",
        "RAG systems and retrieval",
        "fine-tuning vs prompt engineering",
        "LLM agents and tool use",
        "LangChain and LangGraph",
        "evaluation and guardrails",
    ],
    Domain.ML_SYSTEM_DESIGN: [
        "recommendation system design",
        "model serving and inference infrastructure",
        "feature stores and data pipelines",
        "real-time vs batch prediction",
        "A/B testing and model versioning",
        "vector databases and similarity search",
        "LLM deployment and cost optimization",
        "monitoring ML models in production",
        "training pipelines and orchestration",
        "multi-modal system design",
    ],
}


QUESTION_COUNT_OPTIONS = [5, 8, 10]

DIFFICULTY_INSTRUCTIONS: dict[str, str] = {
    Difficulty.EASY: (
        "Ask foundational conceptual questions. "
        "Expect definitions, basic examples, and simple use cases. "
        "Do not ask about edge cases or system-level tradeoffs."
    ),
    Difficulty.MEDIUM: (
        "Ask questions that require applied understanding. "
        "Expect the candidate to explain tradeoffs, give examples from experience, "
        "and reason through problems step by step."
    ),
    Difficulty.HARD: (
        "Ask advanced questions involving system design tradeoffs, edge cases, "
        "and deep technical reasoning. "
        "Expect the candidate to defend their answers and handle follow-up challenges."
    ),
}
