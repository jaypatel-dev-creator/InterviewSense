import { useRef, useCallback } from 'react'
import { InterviewWebSocket, buildInterviewWSUrl } from '../services/websocket'
import { useSessionStore } from '../store/sessionStore'
import { useUIStore } from '../store/uiStore'
import { speakText } from '../services/tts'

export function useWebSocket() {
  const { setQuestion, updateLiveTranscript, setLastEvaluation, setReport, setTurns } = useSessionStore()
  const { setAISpeaking, setProcessing, setError, setScreen } = useUIStore()

  // useRef instead of module-level singleton — scoped to this hook instance,
  // created fresh per session, never shared across renders or sessions.
  // The previous singleton pattern caused stale connection reuse across sessions
  // because WebSocket connections are stateful (bound to a session ID + server state).
  const wsRef = useRef(null)

  const connect = useCallback((sessionId, params) => {
    // Guard against duplicate connections from React strict mode double-invoke
    if (wsRef.current?.isConnected?.()) {
      console.warn('WS already connected — skipping duplicate connect')
      return
    }

    const url = buildInterviewWSUrl(sessionId, params)

    wsRef.current = new InterviewWebSocket(url, {
      onOpen: () => {
        console.log('WS connected')
        setProcessing(false)
      },

      onMessage: (data) => {
        switch (data.type) {
          case 'question':
            setQuestion(data.question, data.question_number, data.question_count)
            setAISpeaking(true)
            setProcessing(false)
            speakText(data.question).then(() => setAISpeaking(false))
            break

          case 'transcript_update':
            updateLiveTranscript(data.text, data.speech_metrics)
            break

          case 'report_ready':
            setReport(data.report)
            setTurns(data.turns || [])
            setScreen('report')
            wsRef.current?.disconnect()
            wsRef.current = null
            break

          case 'error':
            setError(data.message)
            setProcessing(false)
            break

          default:
            break
        }

        if (data.evaluation) {
          setLastEvaluation(data.evaluation)
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

    wsRef.current.connect()
  }, [setQuestion, updateLiveTranscript, setLastEvaluation, setReport, setTurns, setAISpeaking, setProcessing, setError, setScreen])

  const sendAudio = useCallback((buffer) => {
    wsRef.current?.sendAudio(buffer)
  }, [])

  const sendText = useCallback((text) => {
    wsRef.current?.sendText(text)
    setProcessing(true)
  }, [setProcessing])

  const sendControl = useCallback((type) => {
    wsRef.current?.sendControl(type)
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect()
    wsRef.current = null
  }, [])

  return { connect, sendAudio, sendText, sendControl, disconnect }
}we