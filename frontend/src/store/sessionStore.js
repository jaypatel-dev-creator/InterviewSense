import { create } from 'zustand'

export const useSessionStore = create((set, get) => ({
  // Session identity
  sessionId: null,
  sessionConfig: null,

  // Interview state
  currentQuestion: null,
  currentQuestionNumber: 0,
  questionCount: 0,
  turns: [],
  interviewComplete: false,

  // Live data
  liveTranscript: '',
  speechMetrics: null,
  lastEvaluation: null,

  // Report
  report: null,

  // Actions
  setSession: (sessionId, config) =>
    set({
      sessionId,
      sessionConfig: config,
      currentQuestion: null,
      currentQuestionNumber: 0,
      questionCount: config.questionCount,
      turns: [],
      interviewComplete: false,
      liveTranscript: '',
      speechMetrics: null,
      lastEvaluation: null,
      report: null,
    }),

  // evaluation is passed here directly — question message embeds evaluation
  // from the backend. Clearing and setting evaluation atomically in one
  // set() call guarantees no stale evaluation bleeds into the next question.
  setQuestion: (question, questionNumber, questionCount, evaluation = null) =>
    set({
      currentQuestion: question,
      currentQuestionNumber: questionNumber,
      questionCount: questionCount ?? get().questionCount,
      liveTranscript: '',
      lastEvaluation: evaluation,
    }),

  updateLiveTranscript: (text, metrics) =>
    set({ liveTranscript: text, speechMetrics: metrics }),

  addTurn: (turn) =>
    set((state) => ({ turns: [...state.turns, turn] })),

  setTurns: (turns) =>
    set({ turns }),

  setLastEvaluation: (evaluation) =>
    set({ lastEvaluation: evaluation }),

  setReport: (report) =>
    set({ report, interviewComplete: true }),

  resetSession: () =>
    set({
      sessionId: null,
      sessionConfig: null,
      currentQuestion: null,
      currentQuestionNumber: 0,
      questionCount: 0,
      turns: [],
      interviewComplete: false,
      liveTranscript: '',
      speechMetrics: null,
      lastEvaluation: null,
      report: null,
    }),
}))