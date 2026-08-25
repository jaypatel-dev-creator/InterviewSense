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
        "two pointers and sliding window",
        "binary search and its variants",
        "trie and prefix trees",
        "union find and disjoint sets",
        "bit manipulation",
        "greedy algorithms",
        "topological sort and DAGs",
        "segment trees and Fenwick trees",
        "hash maps and hash sets",
        "interval problems and sweep line",
        "matrix and 2D grid problems",
        "monotonic stack and queue",
        "fast and slow pointers",
        "string matching and pattern search",
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
        "distributed locking and coordination",
        "search systems and Elasticsearch",
        "notification systems and pub/sub",
        "URL shortener design",
        "design a feed or timeline system",
        "design a distributed cache",
        "design a payment processing system",
        "design a ride-sharing backend",
        "design a real-time chat system",
        "design a video streaming platform",
        "SQL vs NoSQL trade-offs",
        "event sourcing and CQRS",
        "service discovery and API gateway",
        "design a file storage system like S3",
        "design a distributed job scheduler",
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
        "database transactions and ACID",
        "connection pooling and N+1 problem",
        "OAuth2 and JWT deep dive",
        "gRPC vs REST vs GraphQL",
        "circuit breakers and retry patterns",
        "twelve-factor app principles",
        "database migrations and schema evolution",
        "secrets management and environment config",
        "distributed tracing and structured logging",
        "idempotency and exactly-once delivery",
        "rate limiting algorithms — token bucket vs leaky bucket",
        "caching at the application layer — Redis patterns",
        "event-driven architecture with Kafka or RabbitMQ",
        "CI/CD pipelines and deployment strategies",
        "CORS, HTTPS, and API security basics",
    ],
    Domain.AI_ML: [
        # ML Fundamentals
        "supervised vs unsupervised learning",
        "model evaluation metrics",
        "overfitting and regularization",
        "bias-variance tradeoff",
        "cross-validation and model selection",
        "feature engineering and selection",
        "clustering algorithms — k-means, DBSCAN",
        "gradient descent and optimization basics",
        "model compression and quantization",
        "RLHF and alignment techniques",
        # AI Engineering
        "embeddings and vector representations",
        "transformer architecture and attention",
        "RAG systems and retrieval",
        "fine-tuning vs prompt engineering",
        "LLM agents and tool use",
        "LangChain and LangGraph",
        "evaluation and guardrails",
        "tokenization and context windows",
        "temperature, top-p, and sampling strategies",
        "chain-of-thought and few-shot prompting",
        "semantic search and dense retrieval",
        "chunking strategies for RAG",
        "hallucination detection and mitigation",
        "multi-agent systems and orchestration",
        "function calling and structured outputs",
        "prompt injection and LLM security",
        "LLM observability and tracing",
        "agentic memory — STM vs LTM",
        "context window management strategies",
        "reranking and hybrid search in RAG",
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
        "design a real-time fraud detection system",
        "design a search ranking system",
        "design an embedding pipeline at scale",
        "shadow deployment and canary releases",
        "data flywheel and feedback loops",
        "online learning vs offline training",
        "model registry and experiment tracking",
        "GPU cluster scheduling and resource management",
        "design a content moderation system",
        "design a personalization engine",
        "design a RAG pipeline for production",
        "design an LLM evaluation framework",
        "latency vs throughput trade-offs in model serving",
        "design a real-time recommendation engine",
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