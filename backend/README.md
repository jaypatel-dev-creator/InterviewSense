# InterviewSense — Backend

FastAPI + LangGraph backend for InterviewSense. Handles WebSocket session management, audio processing, LangGraph pipeline evaluation, JD skill traceability, and report generation.

---

## Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

> No PyTorch installation required. Voice activity detection runs browser-side — the backend has no server-side VAD model dependency.

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
GOOGLE_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_design_voice_id
LANGCHAIN_API_KEY=your_langsmith_key       # optional
LANGCHAIN_TRACING_V2=true                  # optional
APP_ENV=development
SQLITE_DB_PATH=./data/sessions/interviewsense.db
ALLOWED_ORIGINS=["http://localhost:5173"]  # override for deployment
```

> `ELEVENLABS_VOICE_ID` is required — the app will refuse to start without it. Library voices are blocked on the ElevenLabs free tier. Create a custom voice via Voice Design and copy its ID.

### 4. Run

```bash
uvicorn main:app --reload
```

Backend starts at `http://localhost:8000`. SQLite database is created automatically at `./data/sessions/interviewsense.db` on first startup via `Base.metadata.create_all`.

---

## Agent Graph

```
SessionState (LangGraph TypedDict)
    │
    ▼
speech_analytics_node  ──── pure Python, no LLM
    │
    ├── interview_complete = False ──▶  evaluator_router_node  ──▶  END
    │                                   (Gemini, structured output)
    │
    └── interview_complete = True  ──▶  report_generator_node  ──▶  END
                                        (Gemini, plain text output)
```

### Nodes

**`speech_analytics_node`**
Graph entry point and validation gate — runs first on every invocation. Fails fast
with AgentException if turns or transcript are missing, so downstream LLM nodes
(evaluator_router, report_generator) can assume clean state without redundant checks.

Audio processing (Whisper + librosa) intentionally runs pre-graph in the WebSocket
handler via process_audio_chunk(). This ensures transcript_update reaches the client
immediately after the candidate finishes speaking, without waiting for graph invocation
latency. By the time this node executes, speech_metrics and answer_transcript are
already populated in state. Node validates their presence and logs WPM, pauses, and
filler counts. No LLM call — pure Python.

**`evaluator_router_node`**
Single Gemini call with structured Pydantic output (`EvaluatorRouterOutput`). In one shot:
- Scores the candidate's answer (0–10)
- Identifies strengths and missing concepts
- Identifies which JD skill the current question was testing (`jd_skill_targeted`)
- Decides the next question type (`drill_down`, `follow_up`, `new_topic`, `reframe`, `wrap_up`)
- Generates the exact next question text, informed by a rolling conversation summary

The conversation summary is a plain-text log of prior Q&A appended after each turn — no extra LLM call. It gives the evaluator context about how the candidate answered previous questions when generating the next one.

**`evaluator_router_node` — next question types:**

| Type | When used |
|---|---|
| `drill_down` | Answer was correct but shallow — go deeper |
| `follow_up` | Partial answer — probe the gap |
| `new_topic` | Strong answer — move on |
| `reframe` | Wrong answer — try a different angle |
| `wrap_up` | Last question — close the session |

**`report_generator_node`**
Single Gemini call at session end. Receives full turn history, generates a structured improvement plan in plain text: overall summary, top 3 weak topics, top 2 strengths, study recommendations, communication feedback, next mock interview goal.

---

## Audio Pipeline

```
Binary WebSocket frame (Float32Array)
    │
    └── process_audio_chunk()  ─── ThreadPoolExecutor (parallel)
            ├── Groq Whisper v3 Turbo  — transcription + word timestamps
            └── librosa signal analysis
                    ├── WPM            — from word timestamps
                    ├── Pause count    — gaps > 0.5s between words
                    ├── Filler words   — matched against FILLER_WORDS set
                    ├── Energy level   — RMS via librosa
                    ├── Pitch variation — F0 via librosa yin (85–300 Hz range)
                    └── Answer duration — chunk length / sample rate
```

Whisper and librosa run concurrently in a `ThreadPoolExecutor`. Voice activity detection runs browser-side in `useAudioRecorder.js` — audio chunks are only sent when speech is detected.

---

## WebSocket Protocol

**Connection:** `ws://localhost:8000/ws/interview/{session_id}?domain=&difficulty=&question_count=&jd_text=&candidate_name=`

Domain and difficulty are validated before the connection is accepted — invalid values are rejected with close code `1008`.

### Client → Server

| Message | Format | Description |
|---|---|---|
| Audio chunk | Binary (`Float32Array`) | Raw PCM audio, 16kHz mono |
| Text answer | `{"type": "text_answer", "text": "..."}` | Typed answer submission |
| Skip | `{"type": "skip_question"}` | Skip current question |
| Repeat | `{"type": "repeat_question"}` | Replay current question via TTS |
| End interview | `{"type": "end_interview"}` | Force finalize session |

### Server → Client

| Message | Description |
|---|---|
| `{"type": "question", "question": "...", "question_number": N, "question_count": N}` | New question |
| `{"type": "transcript_update", "text": "...", "speech_metrics": {...}}` | Live transcript + metrics |
| `{"type": "report_ready", "report": {...}, "turns": [...]}` | Session complete |
| `{"type": "error", "error_code": "...", "message": "..."}` | Typed error — `TRANSCRIPTION_FAILED`, `AGENT_FAILED`, `INTERNAL_ERROR` |

---

## Scoring Logic

```python
# Technical — averaged over question_count (skipped = 0, not excluded)
avg_technical = sum(correctness_scores) / question_count

# Communication — weighted composite of three paralinguistic signals
energy_score  = min(10.0, (energy_level / 0.10) * 10.0)      # 40%
pitch_score   = min(10.0, (pitch_variation / 60.0) * 10.0)   # 30% — F0 std dev, 85-300 Hz filtered
fluency_score = max(0.0, 10.0 - (filler_count / word_count) * 20.0)  # 30%
communication = energy_score * 0.40 + pitch_score * 0.30 + fluency_score * 0.30

# Pacing — WPM benchmarked against 120–160 wpm ideal
if 120 <= wpm <= 160: score = 10.0
elif wpm < 120: score = 2.0 + (wpm - 80) * (8.0 / 40)
elif wpm > 160: score = 10.0 - (wpm - 160) * (8.0 / 60)

# Composite — weights depend on available metrics
# Full voice (≥ half questions with mic): 60/25/15
# Comm only: 75/25
# Pacing only: 85/15
# Text only: Technical 100%
```

N/A threshold: fewer than `ceil(question_count / 2)` voice answers → Communication and Pacing set to N/A.

---

## JD Coverage

When `jd_text` is provided at session start:

1. JD skills are extracted via a Gemini call and stored in `SessionState.jd_skills`
2. The evaluator-router outputs `jd_skill_targeted` per turn — which JD skill the question tested
3. Post-session, `_finalize_session` computes coverage:

```python
jd_coverage = {
    "tested": [...],        # skills that appeared as jd_skill_targeted
    "not_tested": [...],    # skills never targeted
    "coverage_pct": 66.7,   # tested / total * 100
}
```

Sessions without a JD set `jd_coverage` to `null` — the frontend renders nothing for that section.

---

## Database Schema

SQLAlchemy async ORM with `Base.metadata.create_all` at startup. Tables are created automatically — no manual migration needed for local development.

| Table | Key columns |
|---|---|
| `sessions` | `session_id`, `domain`, `difficulty`, `question_count`, `candidate_name`, `jd_text`, `start_time`, `end_time`, `composite_score` |
| `turns` | `turn_id`, `session_id`, `question_text`, `answer_transcript`, `correctness_score`, `speech_metrics` (JSON), `next_question_type`, `jd_skill_targeted`, `timestamp`, `skipped` |
| `reports` | `report_id`, `session_id`, `technical_score`, `communication_score`, `pacing_score`, `composite_score`, `weak_topics` (JSON), `jd_coverage` (JSON), `improvement_plan_text`, `langsmith_trace_url`, `created_at` |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create session, returns `session_id` |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/sessions/{id}` | Get single session |
| `DELETE` | `/api/sessions/{id}` | Delete session + turns + report |
| `DELETE` | `/api/sessions` | Clear all sessions |
| `GET` | `/api/sessions/{id}/turns` | Get turns for a session |
| `GET` | `/api/sessions/{id}/report` | Get report for a session |
| `POST` | `/api/tts` | Text-to-speech via ElevenLabs |
| `GET` | `/api/health` | Health check |
| `WS` | `/ws/interview/{id}` | Interview WebSocket |

---

## Startup Sequence

On `uvicorn main:app`, the lifespan handler runs in order:

1. `init_db()` — creates AsyncEngine, session factory, and all tables via `Base.metadata.create_all`
2. `load_whisper()` — initializes Groq client singleton
3. `load_elevenlabs()` — initializes ElevenLabs client singleton
4. `compile_graph()` — initializes LLM singleton and compiles LangGraph StateGraph

All external API clients are singletons initialized at startup — no per-request instantiation.

---

## Project Structure

```
backend/
├── agents/
│   ├── evaluator_router.py   # Evaluator-Router LangGraph node
│   ├── llm.py                # Gemini LLM singleton
│   ├── orchestrator.py       # Graph compilation + get_graph() singleton
│   ├── report_generator.py   # Report Generator LangGraph node
│   ├── speech_analytics.py   # Speech Analytics LangGraph node
│   └── state.py              # SessionState + Turn TypedDicts
├── api/
│   ├── routes.py             # REST endpoints
│   └── websocket.py          # WebSocket protocol handler — message routing only
├── audio/
│   ├── analyzer.py           # librosa feature extraction
│   ├── processor.py          # Parallel Whisper + librosa (ThreadPoolExecutor)
│   └── transcriber.py        # Groq Whisper client singleton
├── core/
│   ├── config.py             # pydantic-settings, lru_cache singleton
│   ├── exceptions.py         # Exception hierarchy + FastAPI handlers
│   └── logging.py            # Structured logging setup
├── db/
│   ├── database.py           # AsyncEngine + AsyncSession + init_db()
│   ├── models.py             # SQLAlchemy ORM models (Session, Turn, Report)
│   └── queries.py            # ORM query functions
├── domains/
│   └── topics.py             # 24–30 seed topics × 5 domains
├── prompts/
│   ├── evaluator_router.py   # Evaluator-Router + first question prompt builders
│   ├── jd_extractor.py       # JD skill extraction prompt
│   └── report_generator.py   # Report Generator prompt builder
├── schemas/
│   ├── evaluator_output.py   # EvaluatorRouterOutput Pydantic model
│   ├── report.py             # ReportResponse schema
│   ├── session.py            # SessionResponse schema
│   └── turn.py               # TurnResponse + SpeechMetrics schemas
├── services/
│   ├── elevenlabs.py         # ElevenLabs async client singleton
│   └── session_service.py    # Session business logic — scoring, finalization, JD extraction
├── main.py                   # App factory, lifespan, startup
├── requirements.txt
└── .env.example
```