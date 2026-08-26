# InterviewSense — Frontend

React 19 + Zustand frontend for InterviewSense. Manages WebSocket session lifecycle, real-time audio capture, live transcript display, and report rendering.

---

## Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at `http://localhost:5173`. Requires the backend running at `http://localhost:8000`.

### Environment

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## Screen Flow

```
SetupForm (Step 1 — Domain)
    │
    ▼
SetupForm (Step 2 — Configure: difficulty + question count)
    │
    ▼
SetupForm (Step 3 — Job Description, optional)
    │
    ▼
InterviewScreen  ←──── WebSocket connected, questions flowing
    │
    ▼
ReportScreen  ←──── report_ready received, socket closed
```

---

## State Management

Two Zustand stores:

**`sessionStore`** — interview data
```
sessionId, sessionConfig, currentQuestion, currentQuestionNumber,
questionCount, turns, interviewComplete, liveTranscript,
speechMetrics, lastEvaluation, report
```

**`uiStore`** — UI state
```
screen ('setup' | 'interview' | 'report'),
isAISpeaking, isProcessing, error
```

`report_ready` sets `report`, `turns`, and `interviewComplete` atomically via `useSessionStore.setState()` to prevent stale renders between individual store updates.

---

## WebSocket Hook

`useWebSocket.js` uses a module-level singleton (`_wsInstance`) to prevent React strict mode from creating duplicate connections across re-renders. The singleton is created fresh on each `connect()` call and nulled on `disconnect()`.

**Message handling:**

| Event | Action |
|---|---|
| `question` | `setQuestion()` → `speakText()` via ElevenLabs TTS |
| `transcript_update` | `updateLiveTranscript()` — live display |
| `report_ready` | Atomic store update → navigate to report screen |
| `error` | `setError()` — typed error codes: `TRANSCRIPTION_FAILED`, `AGENT_FAILED`, `INTERNAL_ERROR` |

---

## Audio Pipeline

```
getUserMedia (microphone)
    │
ScriptProcessorNode (bufferSize: 4096)
    │
    ├── Volume meter  ──▶  Waveform.jsx (visual feedback)
    │
    ├── VAD check     ──▶  Silence detection (SILENCE_THRESHOLD, SILENCE_DURATION_MS)
    │
    └── Float32Array chunk accumulation
            │
            └── On silence detected  ──▶  WebSocket.send(binary buffer)
```

**VAD parameters (client-side):**

| Parameter | Value | Purpose |
|---|---|---|
| `SILENCE_THRESHOLD` | 0.01 | Energy below this = silence |
| `SILENCE_DURATION_MS` | 1500 | Silence duration before flush |
| `MIN_AUDIO_SECONDS` | 1.5 | Minimum chunk length to send |
| `MIN_ENERGY` | 0.005 | Minimum energy to consider valid audio |

After flush, mic is torn down (`_teardown()`) and a `teardownRef` flag prevents stale closure re-entry. A double-click guard on the start button prevents duplicate mic initializations.

> **Deprecation note:** `ScriptProcessorNode` is deprecated in favour of `AudioWorkletNode`. The current implementation works correctly but may show a browser console warning. Migration to `AudioWorkletNode` is a future improvement.

---

## Component Structure

```
src/
├── components/
│   ├── interview/
│   │   ├── InterviewScreen.jsx   # Main interview layout
│   │   ├── AnalyticsPanel.jsx    # Live speech metrics sidebar
│   │   ├── LiveTranscript.jsx    # Transcript display with blinking cursor
│   │   ├── Waveform.jsx          # Real-time audio waveform visualizer
│   │   ├── DomainSelector.jsx    # Step 1 — domain picker
│   │   └── JDPaste.jsx           # Step 3 — JD textarea
│   ├── report/
│   │   ├── ReportScreen.jsx      # Report layout — scores, JD coverage, improvement plan, breakdown
│   │   ├── ScoreCard.jsx         # Overall + per-metric scores
│   │   ├── ImprovementPlan.jsx   # Improvement plan paragraphs
│   │   └── QuestionBreakdown.jsx # Per-question scores, strengths, missed, JD skill targeted
│   ├── setup/
│   │   └── SetupForm.jsx         # 3-step wizard (domain → configure → JD)
│   └── history/
│       ├── SessionHistory.jsx    # Sidebar — past sessions list
│       └── SessionCard.jsx       # Individual session entry
├── hooks/
│   ├── useWebSocket.js           # WebSocket singleton + message routing
│   ├── useSession.js             # Session lifecycle (start, end, reset)
│   └── useAudioRecorder.js       # Mic capture, VAD, chunk flushing
├── services/
│   ├── websocket.js              # InterviewWebSocket class
│   └── tts.js                    # ElevenLabs TTS via /api/tts proxy
├── store/
│   ├── sessionStore.js           # Interview + report state
│   └── uiStore.js                # Screen + UI flags
└── pages/
    └── App.jsx                   # Root layout, screen router
```

---

## TTS Proxy

ElevenLabs blocks direct browser API calls on the free tier. All TTS requests are proxied through the backend `/api/tts` endpoint:

```
speakText(question)
    │
    ▼
POST /api/tts  { text: "..." }
    │
    ▼
ElevenLabs API  →  audio/mpeg stream
    │
    ▼
Web Audio API  →  plays in browser
```

---

## Key Design Decisions

**Skip guard** — the Skip button has a 1500ms lock (`skipLockRef`) to prevent double-click sending two `skip_question` messages before the backend processes the first.

**Repeat button** — sends `{"type": "repeat_question"}` control message. Backend re-sends the current question text; `speakText()` fires again via TTS.

**Text fallback** — any question can be answered by typing instead of speaking. Text answers bypass the audio pipeline entirely — `sendText()` sends `{"type": "text_answer", "text": "..."}`. Communication and Pacing scores show N/A for sessions where fewer than half the answers were voiced.

**Session reset** — `resetAndGoHome()` calls `resetSession()` (clears all Zustand state) then `disconnect()` (nulls WebSocket singleton) before navigating to setup. No stale state carries across sessions.