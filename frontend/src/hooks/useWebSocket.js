import { useCallback } from 'react'
import { InterviewWebSocket, buildInterviewWSUrl } from '../services/websocket'
import { useSessionStore } from '../store/sessionStore'
import { useUIStore } from '../store/uiStore'
import { speakText } from '../services/tts'

// Module-level singleton — shared across all hook instances
let _wsInstance = null

export function useWebSocket() {
  const { setQuestion, updateLiveTranscript, setLastEvaluation, setReport, setTurns } = useSessionStore()
  const { setAISpeaking, setProcessing, setError, setScreen } = useUIStore()

  const connect = useCallback((sessionId, params) => {
    const url = buildInterviewWSUrl(sessionId, params)

    _wsInstance = new InterviewWebSocket(url, {
      onOpen: () => {
        console.log('WS connected')
        setProcessing(false)
      },

      onMessage: (data) => {
        switch (data.type) {
          case 'question':
            // Pass evaluation into setQuestion so it is cleared/set atomically
            // in one Zustand set() call. evaluation is embedded inside the
            // question message from the backend — passing it here guarantees
            // the new question and its evaluation (or null for Q1) render together,
            // with no stale evaluation from the previous question bleeding through.
            setQuestion(
              data.question,
              data.question_number,
              data.question_count,
              data.evaluation || null,
            )
            setAISpeaking(true)
            setProcessing(false)
            speakText(data.question).then(() => setAISpeaking(false))
            break

          case 'transcript_update':
            updateLiveTranscript(data.text, data.speech_metrics)
            break

          case 'report_ready':
            // Commit report, turns, and screen atomically — prevents ReportScreen
            // rendering with stale data between individual setX calls.
            useSessionStore.setState({
              report: data.report,
              turns: data.turns || [],
              interviewComplete: true,
            })
            setScreen('report')
            _wsInstance?.disconnect()
            _wsInstance = null
            break

          case 'error':
            setError(data.message)
            setProcessing(false)
            break

          default:
            break
        }
      },

      onError: (err) => {
        console.error('WS error:', err)
        setError('Connection error. Please try again.')
        setProcessing(false)
      },

      onClose: () => {
        console.log('WS closed')
        setAISpeaking(false)
      },
    })

    _wsInstance.connect()
  }, [setQuestion, updateLiveTranscript, setLastEvaluation, setReport, setTurns, setAISpeaking, setProcessing, setError, setScreen])

  const sendAudio = useCallback((buffer) => {
    _wsInstance?.sendAudio(buffer)
  }, [])

  const sendText = useCallback((text) => {
    _wsInstance?.sendText(text)
    setProcessing(true)
    // Reset speech metrics to zeros when text answer is submitted —
    // no transcript_update arrives for text answers, so without this reset
    // the panel would keep showing the previous voice answer's metrics.
    // AnalyticsPanel detects wpm === 0 && duration === 0 as a text answer
    // and shows "Text answer — no speech data recorded." label.
    updateLiveTranscript('', {
      wpm: 0,
      pause_count: 0,
      filler_word_count: 0,
      answer_duration_seconds: 0,
    })
  }, [setProcessing, updateLiveTranscript])

  const sendControl = useCallback((type) => {
    _wsInstance?.sendControl(type)
  }, [])

  const disconnect = useCallback(() => {
    _wsInstance?.disconnect()
    _wsInstance = null
  }, [])

  return { connect, sendAudio, sendText, sendControl, disconnect }
}