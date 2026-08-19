# InterviewSense

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-1.2-FF6B35?style=flat)
![Gemini](https://img.shields.io/badge/Gemini-3.1_Flash_Lite-4285F4?style=flat&logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Whisper_v3_Turbo-F55036?style=flat)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-TTS-000000?style=flat)
![Status](https://img.shields.io/badge/Status-Local_Demo-yellow?style=flat)

A voice-native AI interview coach that simulates real technical interviews end-to-end — adaptive questioning, paralinguistic analysis, and a structured post-session report. Built as a full-stack production system with a multi-agent LangGraph backend and a React frontend.

---

## What It Does

InterviewSense conducts a complete mock technical interview using your microphone or text input, then evaluates your performance across three dimensions:

- **Technical accuracy** — per-question correctness scored by an LLM evaluator
- **Communication** — vocal energy measured via librosa RMS analysis
- **Pacing** — words-per-minute benchmarked against the 120–160 wpm ideal range

At session end, a report generator produces a structured improvement plan: weak topics, strengths, study recommendations, and a concrete goal for the next mock interview.

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
    │   ├── Silero VAD 6.2.1          — voice activity detection
    │   ├── Groq Whisper v3 Turbo     — speech-to-text transcription
    │   └── librosa 0.10.2            — paralinguistic feature extraction
    │       (WPM, pause count, filler words, energy level, pitch variation, silence ratio)
    │
    └── LangGraph Agent Graph
        ├── Speech Analytics Node     — pure Python, no LLM, reads processor output
        ├── Evaluator-Router Node     — single Gemini call, structured Pydantic output
        │   (scores answer + decides next question type in one shot)
        └── Report Generator Node     — single Gemini call at session end
            (improvement plan, weak topics, study recommendations)
```

### Multi-Agent Design

Three LangGraph nodes operate as a directed graph with a conditional edge:

- After each answer, `speech_analytics_node` → `evaluator_router_node` → END
- After the final answer, `speech_analytics_node` → `report_generator_node` → END

The evaluator-router merges what would otherwise be two separate agents — evaluation and next-question generation — into a single structured LLM call, minimising latency and API cost per turn.

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
| VAD | Silero VAD 6.2.1 |
| Paralinguistics | librosa 0.10.2, numpy, scipy |
| Database | SQLite via aiosqlite |

---

## Interview Domains

| Domain | Seed Topics |
|---|---|
| AI / ML Concepts | Transformers, RAG, fine-tuning, evaluation metrics, guardrails, embeddings |
| ML System Design | Feature stores, training pipelines, model serving, monitoring, A/B testing |
| System Design | Distributed systems, CAP theorem, caching, message queues, API design |
| Backend Engineering | REST vs GraphQL, auth, databases, microservices, concurrency |
| DSA | Arrays, trees, graphs, dynamic programming, complexity analysis |

Each domain has 20 seed topics. Without a JD, questions are drawn from the full pool. With a JD, the evaluator-router extracts role-specific skills and biases questioning toward them.

---

## Scoring

| Metric | Method | Weight |
|---|---|---|
| Technical | LLM correctness score (0–10) per question, averaged over `question_count` (skipped = 0) | 60% |
| Communication | librosa RMS energy, rescaled to 0–10 (cap: 0.10 RMS = 10) | 25% |
| Pacing | WPM score: 120–160 wpm = 10, degrades linearly outside range | 15% |

Communication and Pacing show N/A when fewer than half the questions received voice answers. Weights redistribute to Technical only in that case.

> See [Known Limitations](#known-limitations) for scoring and transcript caveats.

---

## Known Limitations

**1. Communication score accuracy — laptop microphone**
Communication score is derived from microphone RMS energy level, rescaled to 0–10. Laptop integrated mics produce significantly lower energy readings than headset or external mics — a normal conversational voice through a laptop mic typically maps to 3–5/10 regardless of actual delivery quality. This is a hardware constraint, not a scoring bug. For accurate communication scoring, use a headset or external microphone.

**2. Live transcript is chunk-based, not word-by-word**
The transcript pipeline buffers audio until Silero VAD detects end-of-speech, then sends the full chunk to Groq Whisper for transcription. The transcript appears all at once after you finish speaking — not incrementally word by word. The architecture is fully streaming-ready; true real-time word-level updates would require switching to a streaming STT provider (e.g. Deepgram) with zero backend architectural changes — Groq Whisper's API does not support streaming transcription.

**3. ElevenLabs free tier — custom voice required**
ElevenLabs blocks library voices on the free tier. The app requires a custom Voice Design voice. `ELEVENLABS_VOICE_ID` has no default and the app will fail to start without it. Monthly character quota (10,000 on free tier) limits the number of sessions per billing cycle.

**4. Gemini free tier rate limits**
The evaluator-router and report generator use Gemini 3.1 Flash Lite (15 RPM, 1500 RPD on free tier). Heavy testing across multiple sessions in a short window may exhaust the daily quota, causing the report generator to return empty output. Upgrading to a paid Gemini tier removes this constraint.

**5. Per-turn latency — chained API calls**
Each voice answer triggers three operations in sequence: Groq Whisper transcription (~1–2s) + librosa CPU audio analysis (~1–3s, runs in parallel with Whisper on a CPU-only machine) + Gemini evaluator-router structured output call (~2–4s). Combined with ElevenLabs TTS synthesis for the next question (~1–2s), expect 5–10 seconds between submitting an answer and hearing the next question.

Final report generation adds an additional 5–10 seconds — the report generator sends the full session context (all 5 turns, scores, domain, difficulty, candidate name) to Gemini in a single prompt, which is token-heavy and requires a complete response before the report screen renders. There is no streaming of the improvement plan — the frontend waits for the full `report_ready` WebSocket event.

This is an API latency and hardware constraint, not an architectural one. Switching to GPU-backed inference (e.g. Groq's faster tiers, Gemini paid tier) and a streaming STT provider would reduce per-turn latency to under 2 seconds. Report generation latency could be reduced by streaming the improvement plan text incrementally over WebSocket as Gemini generates it.

**6. Local only — no deployment**
InterviewSense is designed for local use. The audio pipeline requires direct microphone access via the Web Audio API, which works reliably on localhost. Deploying to a remote server introduces latency in the WebSocket audio stream that degrades VAD accuracy and transcript quality.

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
│   ├── audio/           # VAD, transcriber, analyzer, processor
│   ├── core/            # Config, logging, exceptions
│   ├── db/              # SQLite models, queries, database
│   ├── domains/         # Seed topics per domain
│   ├── prompts/         # LLM prompt builders
│   ├── schemas/         # Pydantic schemas
│   └── utils/           # Shared utilities
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

---
