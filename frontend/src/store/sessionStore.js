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

  setQuestion: (question, questionNumber, questionCount) =>
    set({
      currentQuestion: question,
      currentQuestionNumber: questionNumber,
      questionCount: questionCount ?? get().questionCount,
    }),

  updateLiveTranscript: (text, metrics) =>
    set({ liveTranscript: text, speechMetrics: metrics }),

  addTurn: (turn) =>
    set((state) => ({ turns: [...state.turns, turn] })),

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
