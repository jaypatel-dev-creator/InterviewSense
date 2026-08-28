import { useEffect, useRef, useState } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { useUIStore } from '../../store/uiStore'
import { useSession } from '../../hooks/useSession'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import Waveform from './Waveform'
import LiveTranscript from './LiveTranscript'
import AnalyticsPanel from './AnalyticsPanel'

export default function InterviewScreen() {
  const {
    currentQuestion,
    currentQuestionNumber,
    questionCount,
    liveTranscript,
    speechMetrics,
    lastEvaluation,
  } = useSessionStore()

  const { isRecording, isAISpeaking, isProcessing } = useUIStore()
  const { endSession, sendAudio, sendText, sendControl } = useSession()

  const [volume, setVolume] = useState(0)
  const [textFallback, setTextFallback] = useState(false)
  const [textInput, setTextInput] = useState('')

  // Skip double-click guard — 1500ms lock prevents sending skip_question twice.
  // Without this, rapid double-click sends two messages: backend skips the
  // current question AND the next one before it's even displayed.
  const skipLockRef = useRef(false)

  const { start, stop, stopSilently } = useAudioRecorder(
    (buffer) => sendAudio(buffer),
    (vol) => setVolume(vol),
  )

  // When a new question arrives, stop mic silently — user must click again.
  // Prevents VAD firing on inter-question silence and auto-submitting nothing.
  const prevQuestionNumberRef = useRef(currentQuestionNumber)
  useEffect(() => {
    if (currentQuestionNumber !== prevQuestionNumberRef.current) {
      prevQuestionNumberRef.current = currentQuestionNumber
      stopSilently()
    }
  }, [currentQuestionNumber, stopSilently])

  const toggleRecording = () => {
    if (isRecording) {
      stop()
    } else {
      start()
    }
  }

  const handleTextSubmit = () => {
    if (!textInput.trim()) return
    sendText(textInput.trim())
    setTextInput('')
  }

  const handleRepeat = () => sendControl('repeat_question')
  const handleSkip = () => {
    if (skipLockRef.current || isProcessing) return
    skipLockRef.current = true
    sendControl('skip_question')
    setTimeout(() => { skipLockRef.current = false }, 1500)
  }

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: '#f8f7f4' }}>

      {/* Progress Bar */}
      <div className="h-0.5 w-full" style={{ backgroundColor: '#e2e0db' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${(currentQuestionNumber / questionCount) * 100}%`,
            backgroundColor: '#c84b1a',
          }}
        />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0">

        {/* Left — Main Interview Panel */}
        <div className="flex-1 flex flex-col px-6 py-8 space-y-8">

          {/* Question Counter */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: '#a8a49e' }}>
              Question {currentQuestionNumber} of {questionCount}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRepeat}
                className="text-xs px-3 py-1.5"
                style={{ color: '#6b6860', border: '1px solid #e2e0db' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#c84b1a'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e0db'}
              >
                Repeat
              </button>
              <button
                onClick={handleSkip}
                className="text-xs px-3 py-1.5"
                style={{ color: '#6b6860', border: '1px solid #e2e0db' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#0f0e0c'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e0db'}
              >
                Skip
              </button>
            </div>
          </div>

          {/* Question Display */}
          <div
            className="px-6 py-5"
            style={{ backgroundColor: '#ffffff', border: '1px solid #e2e0db' }}
          >
            {isAISpeaking && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-1"
                      style={{
                        backgroundColor: '#c84b1a',
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: '#c84b1a' }}>
                  InterviewSense is speaking
                </span>
              </div>
            )}
            <p
              className="text-lg leading-relaxed font-medium"
              style={{ color: currentQuestion ? '#0f0e0c' : '#a8a49e' }}
            >
              {currentQuestion || 'Preparing your first question...'}
            </p>
          </div>

          {/* Waveform */}
          <Waveform volume={volume} isRecording={isRecording} />

          {/* Record Button */}
          {!textFallback ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={toggleRecording}
                disabled={isProcessing || isAISpeaking}
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  backgroundColor: isRecording
                    ? 'rgba(239,68,68,0.08)'
                    : 'rgba(200,75,26,0.08)',
                  border: `2px solid ${isRecording ? '#ef4444' : '#c84b1a'}`,
                  opacity: isProcessing || isAISpeaking ? 0.4 : 1,
                  cursor: isProcessing || isAISpeaking ? 'not-allowed' : 'pointer',
                }}
              >
                {isRecording ? (
                  <div
                    className="w-5 h-5"
                    style={{ backgroundColor: '#ef4444' }}
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: '#c84b1a' }}
                  />
                )}
              </button>
              <span className="text-xs" style={{ color: '#a8a49e' }}>
                {isAISpeaking
                  ? 'InterviewSense is speaking...'
                  : isRecording
                  ? 'Recording — click to stop'
                  : 'Click to speak your answer'}
              </span>
              <button
                onClick={() => setTextFallback(true)}
                className="text-xs"
                style={{ color: '#a8a49e' }}
                onMouseEnter={e => e.target.style.color = '#0f0e0c'}
                onMouseLeave={e => e.target.style.color = '#a8a49e'}
              >
                Switch to text input
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={4}
                placeholder="Type your answer here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full px-4 py-3 text-sm resize-none answer-textarea"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e0db',
                  color: '#0f0e0c',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#c84b1a'}
                onBlur={e => e.target.style.borderColor = '#e2e0db'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) handleTextSubmit()
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim() || isProcessing}
                  className="flex-1 py-2.5 text-sm font-medium"
                  style={{
                    backgroundColor: '#c84b1a',
                    color: '#ffffff',
                    opacity: !textInput.trim() || isProcessing ? 0.5 : 1,
                  }}
                >
                  Submit Answer
                </button>
                <button
                  onClick={() => setTextFallback(false)}
                  className="px-4 py-2.5 text-sm"
                  style={{ border: '1px solid #e2e0db', color: '#6b6860' }}
                >
                  Use mic
                </button>
              </div>
            </div>
          )}

          {/* Live Transcript */}
          <LiveTranscript transcript={liveTranscript} />

          {/* End Interview */}
          <div className="flex justify-center pt-4">
            <button
              onClick={endSession}
              className="text-xs px-4 py-2"
              style={{ color: '#a8a49e', border: '1px solid #e2e0db' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#ef4444'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e0db'
                e.currentTarget.style.color = '#a8a49e'
              }}
            >
              End Interview
            </button>
          </div>
        </div>

        {/* Right — Analytics Panel */}
        <div
          className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: '#e2e0db' }}
        >
          <AnalyticsPanel
            metrics={speechMetrics}
            evaluation={lastEvaluation}
          />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}