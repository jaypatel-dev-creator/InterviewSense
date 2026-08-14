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

  const { start, stop } = useAudioRecorder(
    (buffer) => sendAudio(buffer),
    (vol) => setVolume(vol),
  )

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
  const handleSkip = () => sendControl('skip_question')

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>

      {/* Progress Bar */}
      <div className="h-0.5 w-full" style={{ backgroundColor: '#1e1e2e' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${(currentQuestionNumber / questionCount) * 100}%`,
            backgroundColor: '#3b82f6',
          }}
        />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0">

        {/* Left — Main Interview Panel */}
        <div className="flex-1 flex flex-col px-6 py-8 space-y-8">

          {/* Question Counter */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: '#64748b' }}>
              Question {currentQuestionNumber} of {questionCount}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRepeat}
                className="text-xs px-3 py-1.5 rounded-md transition-colors"
                style={{ color: '#64748b', border: '1px solid #1e1e2e' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
              >
                Repeat
              </button>
              <button
                onClick={handleSkip}
                className="text-xs px-3 py-1.5 rounded-md transition-colors"
                style={{ color: '#64748b', border: '1px solid #1e1e2e' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#64748b'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
              >
                Skip
              </button>
            </div>
          </div>

          {/* Question Display */}
          <div
            className="rounded-xl px-6 py-5"
            style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
          >
            {isAISpeaking && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: '#3b82f6',
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: '#3b82f6' }}>
                  InterviewSense is speaking
                </span>
              </div>
            )}
            <p
              className="text-lg leading-relaxed font-medium"
              style={{ color: currentQuestion ? '#f1f5f9' : '#64748b' }}
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
                disabled={isProcessing}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: isRecording
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(59,130,246,0.15)',
                  border: `2px solid ${isRecording ? '#ef4444' : '#3b82f6'}`,
                  boxShadow: isRecording
                    ? '0 0 24px rgba(239,68,68,0.3)'
                    : 'none',
                }}
              >
                {isRecording ? (
                  <div
                    className="w-5 h-5 rounded-sm"
                    style={{ backgroundColor: '#ef4444' }}
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: '#3b82f6' }}
                  />
                )}
              </button>
              <span className="text-xs" style={{ color: '#64748b' }}>
                {isRecording ? 'Recording — click to stop' : 'Click to speak your answer'}
              </span>
              <button
                onClick={() => setTextFallback(true)}
                className="text-xs transition-colors"
                style={{ color: '#64748b' }}
                onMouseEnter={e => e.target.style.color = '#94a3b8'}
                onMouseLeave={e => e.target.style.color = '#64748b'}
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
                className="w-full px-4 py-3 rounded-lg text-sm resize-none"
                style={{
                  backgroundColor: '#111118',
                  border: '1px solid #1e1e2e',
                  color: '#f1f5f9',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#1e1e2e'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) handleTextSubmit()
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim() || isProcessing}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    opacity: !textInput.trim() || isProcessing ? 0.5 : 1,
                  }}
                >
                  Submit Answer
                </button>
                <button
                  onClick={() => setTextFallback(false)}
                  className="px-4 py-2.5 rounded-lg text-sm transition-colors"
                  style={{ border: '1px solid #1e1e2e', color: '#64748b' }}
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
              className="text-xs px-4 py-2 rounded-lg transition-colors"
              style={{ color: '#64748b', border: '1px solid #1e1e2e' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#ef4444'
                e.currentTarget.style.color = '#fca5a5'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e1e2e'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              End Interview
            </button>
          </div>
        </div>

        {/* Right — Analytics Panel */}
        <div
          className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: '#1e1e2e' }}
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
