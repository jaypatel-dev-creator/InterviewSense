# InterviewSense

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-1.2-FF6B35?style=flat)
![Gemini](https://img.shields.io/badge/Gemini-3.1_Flash_Lite-4285F4?style=flat&logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Whisper_v3_Turbo-F55036?style=flat)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-TTS-000000?style=flat)
![Status](https://img.shields.io/badge/Status-Local_Demo-yellow?style=flat)

A voice-native AI interview coach that simulates real technical interviews end-to-end — adaptive questioning, paralinguistic analysis, JD skill traceability, and a structured post-session report. Built as a full-stack production system with a LangGraph evaluation pipeline backend and a React frontend.

---

## What It Does

InterviewSense conducts a complete mock technical interview using your microphone as primary source or text input as a fallback, then evaluates your performance across three dimensions:

- **Technical accuracy** — per-question correctness scored by an LLM evaluator
- **Communication** — weighted composite of vocal energy, pitch variation, and fluency
- **Pacing** — words-per-minute benchmarked against the 120–160 wpm ideal range

The evaluator adapts each follow-up question based on a rolling conversation summary — it knows how you answered Q1 when generating Q3, not just what topic was covered.

If a job description is provided, the system extracts role-specific skills, maps each interview question to a targeted JD skill, and reports post-session coverage: which skills were tested and which were missed.

At session end, a report generator produces a structured improvement plan: weak topics, strengths, study recommendations, JD coverage breakdown, and a concrete goal for the next mock interview.

---

## Architecture

```
Browser (React + Zustand)
    │
    ├── WebSocket (binary audio chunks + JSON control messages)
    │
FastAPI Backend
    │
    ├── Audio Pipeline
    │   ├── Groq Whisper v3 Turbo     — speech-to-text transcription
    │   └── librosa 0.10.2            — paralinguistic feature extraction
    │       (WPM, pause count, filler words, energy level, pitch variation)
    │
    └── LangGraph Agent Graph
        ├── Speech Analytics Node     — pure Python, no LLM, reads processor output
        ├── Evaluator-Router Node     — single Gemini call, structured Pydantic output
        │   (scores answer + generates next question + identifies JD skill targeted)
        │   (receives rolling conversation summary for context-aware follow-ups)
        └── Report Generator Node     — single Gemini call at session end
            (improvement plan, weak topics, JD coverage, study recommendations)
```

> Voice activity detection runs browser-side via the `useAudioRecorder` hook — audio chunks are only sent when speech is detected, keeping the WebSocket stream clean without server-side VAD overhead.

### LangGraph Pipeline Design

Three LangGraph nodes operate as a directed graph with a conditional edge:

- After each answer: `speech_analytics_node` → `evaluator_router_node` → END
- After the final answer: `speech_analytics_node` → `report_generator_node` → END

The evaluator-router merges evaluation, next-question generation, and JD skill targeting into a single structured LLM call, minimising latency and API cost per turn.

### Chunk-Based Transcript Pipeline

Audio is captured in streaming `Float32Array` chunks via the Web Audio API, processed in parallel through Whisper STT and librosa signal analysis on the backend, and streamed back to the frontend as `transcript_update` WebSocket events. True word-by-word streaming is constrained by Groq Whisper's batch transcription API; upgrading to a streaming STT provider (e.g. Deepgram) requires zero architectural changes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Zustand, Tailwind CSS v4, Vite 8 |
| Backend | FastAPI, Uvicorn, WebSockets |
| Agent Orchestration | LangGraph 1.2, LangChain |
| LLM | Gemini 3.1 Flash Lite via langchain-google-genai |
| STT | Groq Whisper Large v3 Turbo |
| TTS | ElevenLabs (custom Voice Design voice) |
| Paralinguistics | librosa 0.10.2, numpy, scipy |
| Database | SQLite via SQLAlchemy async ORM + aiosqlite |

---

## Interview Domains

| Domain | Coverage |
|---|---|
| AI / ML Concepts | ML fundamentals + AI engineering: RAG, agents, LangGraph, guardrails, embeddings, prompt engineering |
| ML System Design | Model serving, feature stores, RAG pipelines, recommendation systems, monitoring |
| System Design | Distributed systems, CAP theorem, caching, message queues, API design |
| Backend Engineering | REST, auth, databases, concurrency, deployment, rate limiting |
| DSA | Arrays, trees, graphs, dynamic programming, sliding window, monotonic stack |

Each domain has 24–30 seed topics. Without a JD, questions are drawn from the full seed pool. With a JD, the evaluator-router extracts role-specific skills, biases questioning toward them, and tracks which skills were tested post-session.

---

## Scoring

| Metric | Method | Weight |
|---|---|---|
| Technical | LLM correctness score (0–10) per question, averaged over `question_count` (skipped = 0) | 60% |
| Communication | Weighted composite: vocal energy 40% (RMS), pitch variation 30% (F0 std dev), fluency 30% (filler rate) | 25% |
| Pacing | WPM score: 120–160 wpm = 10, degrades linearly outside range | 15% |

Communication and Pacing show N/A when fewer than half the questions received voice answers. Weights redistribute to Technical only in that case.

> See [Known Limitations](#known-limitations) for scoring and transcript caveats.

---

## Known Limitations

**1. Communication score accuracy — laptop microphone**
Communication score is a weighted composite of vocal energy (40%), pitch variation (30%), and fluency/filler rate (30%). Laptop integrated mics produce lower RMS energy readings than headset or external mics — the energy component will read low, but pitch variation and fluency scores are hardware-independent and help balance the overall communication score. For best results, use a headset or external microphone.

**2. Live transcript is chunk-based, not word-by-word**
The transcript pipeline sends audio chunks to Groq Whisper for transcription after speech is detected. The transcript appears all at once after you finish speaking — not incrementally word by word. True real-time word-level updates would require switching to a streaming STT provider (e.g. Deepgram) with zero backend architectural changes — Groq Whisper's API does not support streaming transcription.

**3. ElevenLabs free tier — custom voice required**
ElevenLabs blocks library voices on the free tier. The app requires a custom Voice Design voice. `ELEVENLABS_VOICE_ID` has no default and the app will fail to start without it. Monthly character quota (10,000 on free tier) limits the number of sessions per billing cycle.

**4. Gemini free tier rate limits**
The evaluator-router and report generator use Gemini 3.1 Flash Lite (15 RPM, 1500 RPD on free tier). Heavy testing across multiple sessions in a short window may exhaust the daily quota, causing the report generator to return empty output. Upgrading to a paid Gemini tier removes this constraint.

**5. Per-turn latency — chained API calls**
Each voice answer triggers three operations: Groq Whisper transcription (~1–2s) + librosa CPU audio analysis (~1–3s, runs in parallel) + Gemini evaluator-router structured output call (~2–4s). Combined with ElevenLabs TTS synthesis for the next question (~1–2s), expect 5–10 seconds between submitting an answer and hearing the next question.

**6. Browser-side VAD — energy threshold, not neural**
Voice activity detection runs in the browser via an RMS energy threshold. This works reliably in quiet environments but can misfire in noisy conditions or cut off soft-spoken answers early. For production, the correct upgrade is a lightweight ONNX version of Silero VAD running in the browser via `onnxruntime-web` — same browser-side architecture, neural accuracy, zero server round-trip overhead.

**7. Local only — no deployment**
InterviewSense is designed for local use. The audio pipeline requires direct microphone access via the Web Audio API, which works reliably on localhost. Deploying to a remote server introduces latency in the WebSocket audio stream that degrades transcript quality. CORS origins are configurable via the `ALLOWED_ORIGINS` environment variable for deployment.

---

## Local Setup

See [`backend/README.md`](backend/README.md) for backend setup and [`frontend/README.md`](frontend/README.md) for frontend setup.

**Prerequisites:** Python 3.12, Node.js 18+, Windows/macOS/Linux

**API keys required:**
- Google Gemini — [aistudio.google.com](https://aistudio.google.com)
- Groq — [console.groq.com](https://console.groq.com)
- ElevenLabs — [elevenlabs.io](https://elevenlabs.io) (free tier; requires custom Voice Design voice — library voices are blocked on free tier)
- LangSmith — [smith.langchain.com](https://smith.langchain.com) (optional, for tracing)

---

## Repository Structure

```
InterviewSense/
├── backend/
│   ├── agents/          # LangGraph nodes + state + LLM singleton
│   ├── api/             # FastAPI routes + WebSocket handler
│   ├── audio/           # Transcriber, analyzer, processor
│   ├── core/            # Config, logging, exceptions
│   ├── db/              # SQLAlchemy ORM models, queries, database
│   ├── domains/         # Seed topics per domain
│   ├── prompts/         # LLM prompt builders
│   ├── schemas/         # Pydantic schemas
│   └── services/        # External API client singletons (ElevenLabs, session logic)
├── frontend/
│   ├── src/
│   │   ├── components/  # Interview, report, setup, history UI
│   │   ├── hooks/       # WebSocket, session, audio recorder
│   │   ├── services/    # WebSocket client, TTS
│   │   ├── store/       # Zustand session + UI stores
│   │   └── pages/       # App entry
│   └── public/
├── backend/README.md    # Backend deep dive
└── frontend/README.md   # Frontend deep dive
```