import { useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { useUIStore } from '../../store/uiStore'
import DomainSelector from './DomainSelector'
import JDPaste from './JDPaste'

const STEPS = ['domain', 'config', 'jd']

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', desc: 'Foundational concepts, definitions, basic examples' },
  { value: 'medium', label: 'Medium', desc: 'Applied understanding, tradeoffs, reasoning' },
  { value: 'hard', label: 'Hard', desc: 'Advanced tradeoffs, edge cases, deep reasoning' },
]

const QUESTION_COUNTS = [5, 8, 10]
const STEP_LABELS = ['Domain', 'Configure', 'Job Description']

export default function SetupForm() {
  const { startSession } = useSession()
  const { isProcessing } = useUIStore()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    candidateName: '',
    domain: '',
    difficulty: 'medium',
    questionCount: 5,
    jdText: '',
  })

  const canProceed = () => {
    if (step === 0) return form.domain !== ''
    return true
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleSubmit = async () => {
    await startSession(form)
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 py-16 min-h-screen"
      style={{ backgroundColor: '#f8f7f4' }}
    >
      {/* Progress */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center gap-0">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div
                  className="w-7 h-7 flex items-center justify-center text-xs font-semibold"
                  style={{
                    backgroundColor: i < step ? '#c84b1a' : i === step ? '#c84b1a' : '#ffffff',
                    border: `1px solid ${i <= step ? '#c84b1a' : '#e2e0db'}`,
                    color: i <= step ? '#fff' : '#a8a49e',
                  }}
                >
                  {i < step ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : i + 1}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: i <= step ? '#0f0e0c' : '#a8a49e' }}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="flex-1 h-px mx-4"
                  style={{ backgroundColor: i < step ? '#c84b1a' : '#e2e0db' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-xl"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e0db',
        }}
      >
        {/* Step content */}
        <div className="p-8">

          {/* Step 0 — Domain */}
          {step === 0 && (
            <div className="space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0f0e0c' }}>
                  What are you practicing?
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: '#6b6860' }}>
                  Pick a domain and InterviewSense will generate targeted questions.
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#a8a49e' }}>
                  Your name (optional)
                </label>
                <input
                  type="text"
                  placeholder="Jay"
                  value={form.candidateName}
                  onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                  className="w-full px-4 py-3 text-sm"
                  style={{
                    backgroundColor: '#f8f7f4',
                    border: '1px solid #e2e0db',
                    color: '#0f0e0c',
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#c84b1a'}
                  onBlur={e => e.target.style.borderColor = '#e2e0db'}
                />
              </div>

              <DomainSelector
                value={form.domain}
                onChange={(domain) => setForm({ ...form, domain })}
              />
            </div>
          )}

          {/* Step 1 — Config */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0f0e0c' }}>
                  Configure your session
                </h1>
                <p className="text-sm" style={{ color: '#6b6860' }}>
                  Set difficulty and how many questions you want.
                </p>
              </div>

              {/* Difficulty */}
              <div className="space-y-3">
                <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#a8a49e' }}>
                  Difficulty
                </label>
                <div className="space-y-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setForm({ ...form, difficulty: d.value })}
                      className="w-full px-5 py-4 text-left"
                      style={{
                        backgroundColor: form.difficulty === d.value ? 'rgba(200,75,26,0.05)' : '#f8f7f4',
                        border: `1px solid ${form.difficulty === d.value ? '#c84b1a' : '#e2e0db'}`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-medium"
                          style={{ color: form.difficulty === d.value ? '#c84b1a' : '#0f0e0c' }}
                        >
                          {d.label}
                        </span>
                        {form.difficulty === d.value && (
                          <div className="w-1.5 h-1.5" style={{ backgroundColor: '#c84b1a' }} />
                        )}
                      </div>
                      <span className="text-xs mt-1 block" style={{ color: '#a8a49e' }}>
                        {d.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div className="space-y-3">
                <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#a8a49e' }}>
                  Number of questions
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {QUESTION_COUNTS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setForm({ ...form, questionCount: n })}
                      className="py-4 text-sm font-semibold flex flex-col items-center gap-1"
                      style={{
                        backgroundColor: form.questionCount === n ? 'rgba(200,75,26,0.05)' : '#f8f7f4',
                        border: `1px solid ${form.questionCount === n ? '#c84b1a' : '#e2e0db'}`,
                        color: form.questionCount === n ? '#c84b1a' : '#6b6860',
                      }}
                    >
                      <span className="text-lg font-bold">{n}</span>
                      <span className="text-xs" style={{ color: '#a8a49e' }}>
                        {n === 5 && '~10 min'}
                        {n === 8 && '~20 min'}
                        {n === 10 && '~25 min'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — JD */}
          {step === 2 && (
            <div className="space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0f0e0c' }}>
                  Targeting a specific role?
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: '#6b6860' }}>
                  Paste the job description and every question will be targeted to that role.
                  Skip if you want general practice.
                </p>
              </div>

              <JDPaste
                value={form.jdText}
                onChange={(jdText) => setForm({ ...form, jdText })}
              />

              {/* Skip hint */}
              <div
                className="px-4 py-3 text-xs"
                style={{ backgroundColor: '#f8f7f4', border: '1px solid #e2e0db', color: '#a8a49e' }}
              >
                No JD? No problem — InterviewSense will generate questions from the full topic pool for your selected domain.
              </div>
            </div>
          )}
        </div>

        {/* Navigation — pinned to card bottom */}
        <div
          className="px-8 py-5 flex items-center justify-between border-t"
          style={{ borderColor: '#e2e0db' }}
        >
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="text-sm px-5 py-2.5"
              style={{
                color: '#6b6860',
                border: '1px solid #e2e0db',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0f0e0c'
                e.currentTarget.style.color = '#0f0e0c'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e0db'
                e.currentTarget.style.color = '#6b6860'
              }}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-4">
            {step === 2 && (
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="text-sm"
                style={{ color: '#a8a49e' }}
                onMouseEnter={e => e.currentTarget.style.color = '#6b6860'}
                onMouseLeave={e => e.currentTarget.style.color = '#a8a49e'}
              >
                Skip
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-6 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: canProceed() ? '#c84b1a' : '#e2e0db',
                  color: canProceed() ? '#fff' : '#a8a49e',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                }}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="px-6 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: isProcessing ? '#e2e0db' : '#c84b1a',
                  color: isProcessing ? '#a8a49e' : '#fff',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Starting...' : 'Start Interview'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}