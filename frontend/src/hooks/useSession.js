import { useCallback } from 'react'
import { createSession } from '../services/api'
import { useSessionStore } from '../store/sessionStore'
import { useUIStore } from '../store/uiStore'
import { useWebSocket } from './useWebSocket'

export function useSession() {
  const { setSession, resetSession } = useSessionStore()
  const { setScreen, setProcessing, setError } = useUIStore()
  const { connect, disconnect, sendAudio, sendText, sendControl } = useWebSocket()

  const startSession = useCallback(async (formData) => {
    setProcessing(true)
    setError(null)

    try {
      const session = await createSession({
        candidate_name: formData.candidateName || null,
        domain: formData.domain,
        difficulty: formData.difficulty,
        question_count: formData.questionCount,
        jd_text: formData.jdText || null,
      })

      setSession(session.session_id, {
        domain: formData.domain,
        difficulty: formData.difficulty,
        questionCount: formData.questionCount,
        jdText: formData.jdText,
        candidateName: formData.candidateName,
      })

      connect(session.session_id, {
        domain: formData.domain,
        difficulty: formData.difficulty,
        questionCount: formData.questionCount,
        jdText: formData.jdText,
        candidateName: formData.candidateName,
      })

      setScreen('interview')
    } catch (err) {
      setError('Failed to start session. Is the backend running?')
      setProcessing(false)
      console.error(err)
    }
  }, [setSession, setScreen, setProcessing, setError, connect])

  const endSession = useCallback(() => {
    sendControl('end_interview')
    disconnect()
  }, [sendControl, disconnect])

  const resetAndGoHome = useCallback(() => {
    disconnect()
    resetSession()
    setScreen('setup')
  }, [disconnect, resetSession, setScreen])

  return { startSession, endSession, resetAndGoHome, sendAudio, sendText, sendControl }
}
