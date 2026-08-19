import { useRef, useCallback } from 'react'
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
            setQuestion(data.question, data.question_number, data.question_count)
            setAISpeaking(true)
            setProcessing(false)
            speakText(data.question).then(() => setAISpeaking(false))
            break

          case 'transcript_update':
            updateLiveTranscript(data.text, data.speech_metrics)
            break

          case 'report_ready':
            // Set report, turns, and screen atomically in one store update
            // to prevent ReportScreen from rendering with stale data between
            // individual setX calls. Disconnect after state is committed.
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

    _wsInstance.connect()
  }, [setQuestion, updateLiveTranscript, setLastEvaluation, setReport, setTurns, setAISpeaking, setProcessing, setError, setScreen])

  const sendAudio = useCallback((buffer) => {
    _wsInstance?.sendAudio(buffer)
  }, [])

  const sendText = useCallback((text) => {
    _wsInstance?.sendText(text)
    setProcessing(true)
  }, [setProcessing])

  const sendControl = useCallback((type) => {
    _wsInstance?.sendControl(type)
  }, [])

  const disconnect = useCallback(() => {
    _wsInstance?.disconnect()
    _wsInstance = null
  }, [])

  return { connect, sendAudio, sendText, sendControl, disconnect }
}