# InterviewSense — Backend

FastAPI + LangGraph backend for InterviewSense. Handles WebSocket session management, audio processing, multi-agent evaluation, and report generation.

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

### 2. Install PyTorch (CPU-only — required before requirements.txt)

```bash
pip install torch==2.3.1+cpu torchaudio==2.3.1+cpu --index-url https://download.pytorch.org/whl/cpu
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

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
```

> `ELEVENLABS_VOICE_ID` is required — the app will refuse to start without it. Library voices are blocked on the ElevenLabs free tier. Create a custom voice via Voice Design and copy its ID.

### 5. Run

```bash
uvicorn main:app --reload
```

Backend starts at `http://localhost:8000`.

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
Reads audio features already attached to state by the WebSocket handler after parallel Whisper + librosa processing. Validates and logs WPM, pauses, fillers. No LLM call — pure Python.

**`evaluator_router_node`**
Single Gemini call with structured Pydantic output (`EvaluatorRouterOutput`). Scores the candidate's answer (0–10), identifies strengths and missing concepts, and decides the next question type (`drill_down`, `follow_up`, `new_topic`, `reframe`, `wrap_up`). Merges evaluation and routing into one shot.

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
    ├── Silero VAD          — detects speech end, triggers flush
    │
    └── process_audio_chunk()  ─── ThreadPoolExecutor (parallel)
            ├── Groq Whisper v3 Turbo  — transcription + word timestamps
            └── librosa signal analysis
                    ├── WPM            — from word timestamps
                    ├── Pause count    — gaps > 0.5s between words
                    ├── Filler words   — matched against FILLER_WORDS set
                    ├── Energy level   — RMS via librosa
                    ├── Pitch variation — F0 via librosa yin
                    ├── Silence ratio  — frames below energy threshold
                    └── Answer duration — chunk length / sample rate
```

Whisper and librosa run concurrently in a `ThreadPoolExecutor`. After both complete, word-derived metrics (WPM, pause count, filler count) are merged into the signal analysis result selectively — avoiding a second full librosa run.

---

## WebSocket Protocol

**Connection:** `ws://localhost:8000/ws/interview/{session_id}?domain=&difficulty=&question_count=&jd_text=&candidate_name=`

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
| `{"type": "connected"}` | Session accepted |
| `{"type": "question", "question": "...", "question_number": N, "question_count": N}` | New question |
| `{"type": "transcript_update", "text": "...", "speech_metrics": {...}}` | Live transcript + metrics after each audio chunk |
| `{"type": "report_ready", "report": {...}, "turns": [...]}` | Session complete |
| `{"type": "error", "message": "..."}` | Error during processing |
| `{"type": "ping"}` | Keepalive (every 30s) |

---

## Scoring Logic

```python
# Technical — averaged over question_count (skipped = 0, not excluded)
avg_technical = sum(correctness_scores) / question_count

# Communication — librosa RMS rescaled to 0–10
score = min(10.0, (energy_level / 0.10) * 10.0)

# Pacing — WPM benchmarked against 120–160 wpm ideal
if 120 <= wpm <= 160: score = 10.0
elif wpm < 120: score = max(0, 10 - (120 - wpm) / 12)
elif wpm > 160: score = max(0, 10 - (wpm - 160) / 20)

# Composite — weights depend on available metrics
# Full voice (≥ half questions with mic): 60/25/15
# Comm only: 75/25
# Pacing only: 85/15
# Text only: Technical 100%
```

N/A threshold: fewer than `ceil(question_count / 2)` voice answers → Communication and Pacing set to N/A.

---

## Database Schema

```sql
-- Sessions
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    question_count INTEGER NOT NULL,
    candidate_name TEXT,
    jd_text TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    composite_score REAL
);

-- Turns
CREATE TABLE turns (
    turn_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    answer_transcript TEXT,
    correctness_score REAL,
    speech_metrics TEXT,      -- JSON
    next_question_type TEXT,
    timestamp TEXT NOT NULL,
    skipped INTEGER DEFAULT 0
);

-- Reports
CREATE TABLE reports (
    report_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    technical_score REAL,
    communication_score REAL,
    pacing_score REAL,
    composite_score REAL,
    weak_topics TEXT,         -- JSON array
    improvement_plan_text TEXT,
    langsmith_trace_url TEXT,
    created_at TEXT NOT NULL
);
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create session, returns `session_id` |
| `GET` | `/api/sessions` | List all sessions with reports |
| `DELETE` | `/api/sessions/{id}` | Delete session + turns + report |
| `DELETE` | `/api/sessions` | Clear all sessions |
| `GET` | `/api/sessions/{id}/turns` | Get turns for a session |
| `POST` | `/api/tts` | Text-to-speech via ElevenLabs |
| `WS` | `/ws/interview/{id}` | Interview WebSocket |

---

## Project Structure

```
backend/
├── agents/
│   ├── evaluator_router.py   # Evaluator-Router LangGraph node
│   ├── llm.py                # LLM singleton (lru_cache)
│   ├── orchestrator.py       # Graph compilation + build_graph()
│   ├── report_generator.py   # Report Generator LangGraph node
│   ├── speech_analytics.py   # Speech Analytics LangGraph node
│   └── state.py              # SessionState TypedDict
├── api/
│   ├── routes.py             # REST endpoints
│   └── websocket.py          # WebSocket handler + _finalize_session
├── audio/
│   ├── analyzer.py           # librosa feature extraction
│   ├── processor.py          # Parallel Whisper + librosa
│   ├── transcriber.py        # Groq Whisper client
│   └── vad.py                # Silero VAD singleton
├── core/
│   ├── config.py             # pydantic-settings, lru_cache singleton
│   ├── exceptions.py         # Exception hierarchy
│   └── logging.py            # Structured logging setup
├── db/
│   ├── database.py           # aiosqlite connection
│   ├── models.py             # Table creation
│   └── queries.py            # All DB operations
├── domains/
│   └── topics.py             # 20 seed topics × 5 domains
├── prompts/
│   ├── evaluator_router.py   # Evaluator-Router prompt builder
│   ├── jd_extractor.py       # JD skill extraction prompt
│   └── report_generator.py   # Report Generator prompt builder
├── schemas/
│   ├── evaluator_output.py   # EvaluatorRouterOutput Pydantic model
│   ├── report.py             # ReportResponse schema
│   ├── session.py            # SessionResponse schema
│   └── turn.py               # TurnResponse + SpeechMetrics schemas
├── utils/
│   └── audio_helpers.py      # Reserved for future audio utilities
├── main.py                   # App factory, lifespan, startup
├── requirements.txt
└── .env.example
```