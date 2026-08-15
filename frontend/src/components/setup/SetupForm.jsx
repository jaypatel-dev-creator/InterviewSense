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
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Progress */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center gap-0">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: i < step ? '#3b82f6' : i === step ? '#3b82f6' : '#141414',
                    border: `1px solid ${i <= step ? '#3b82f6' : '#222'}`,
                    color: i <= step ? '#fff' : '#333',
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
                  style={{ color: i <= step ? '#94a3b8' : '#333' }}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="flex-1 h-px mx-4 transition-all duration-500"
                  style={{ backgroundColor: i < step ? '#3b82f6' : '#1a1a1a' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-xl rounded-2xl"
        style={{
          backgroundColor: '#111111',
          border: '1px solid #1a1a1a',
        }}
      >
        {/* Step content */}
        <div className="p-8">

          {/* Step 0 — Domain */}
          {step === 0 && (
            <div className="space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#f1f5f9' }}>
                  What are you practicing?
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: '#444' }}>
                  Pick a domain and InterviewSense will generate targeted questions.
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#333' }}>
                  Your name (optional)
                </label>
                <input
                  type="text"
                  placeholder="Jay"
                  value={form.candidateName}
                  onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: '#0d0d0d',
                    border: '1px solid #1a1a1a',
                    color: '#f1f5f9',
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#1a1a1a'}
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
                <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#f1f5f9' }}>
                  Configure your session
                </h1>
                <p className="text-sm" style={{ color: '#444' }}>
                  Set difficulty and how many questions you want.
                </p>
              </div>

              {/* Difficulty */}
              <div className="space-y-3">
                <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#333' }}>
                  Difficulty
                </label>
                <div className="space-y-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setForm({ ...form, difficulty: d.value })}
                      className="w-full px-5 py-4 rounded-xl text-left transition-all"
                      style={{
                        backgroundColor: form.difficulty === d.value ? 'rgba(59,130,246,0.07)' : '#0d0d0d',
                        border: `1px solid ${form.difficulty === d.value ? '#3b82f6' : '#1a1a1a'}`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-medium"
                          style={{ color: form.difficulty === d.value ? '#60a5fa' : '#94a3b8' }}
                        >
                          {d.label}
                        </span>
                        {form.difficulty === d.value && (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                        )}
                      </div>
                      <span className="text-xs mt-1 block" style={{ color: '#333' }}>
                        {d.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div className="space-y-3">
                <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#333' }}>
                  Number of questions
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {QUESTION_COUNTS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setForm({ ...form, questionCount: n })}
                      className="py-4 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-1"
                      style={{
                        backgroundColor: form.questionCount === n ? 'rgba(59,130,246,0.07)' : '#0d0d0d',
                        border: `1px solid ${form.questionCount === n ? '#3b82f6' : '#1a1a1a'}`,
                        color: form.questionCount === n ? '#60a5fa' : '#444',
                      }}
                    >
                      <span className="text-lg font-bold">{n}</span>
                      <span className="text-xs" style={{ color: '#333' }}>
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
                <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#f1f5f9' }}>
                  Targeting a specific role?
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: '#444' }}>
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
                className="rounded-xl px-4 py-3 text-xs"
                style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a', color: '#333' }}
              >
                No JD? No problem — InterviewSense will generate questions from the full topic pool for your selected domain.
              </div>
            </div>
          )}
        </div>

        {/* Navigation — pinned to card bottom */}
        <div
          className="px-8 py-5 flex items-center justify-between border-t"
          style={{ borderColor: '#1a1a1a' }}
        >
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="text-sm px-5 py-2.5 rounded-xl transition-all"
              style={{
                color: '#444',
                border: '1px solid #1a1a1a',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#2a2a2a'
                e.currentTarget.style.color = '#94a3b8'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1a1a1a'
                e.currentTarget.style.color = '#444'
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
                className="text-sm transition-colors"
                style={{ color: '#333' }}
                onMouseEnter={e => e.currentTarget.style.color = '#555'}
                onMouseLeave={e => e.currentTarget.style.color = '#333'}
              >
                Skip
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: canProceed() ? '#3b82f6' : '#141414',
                  color: canProceed() ? '#fff' : '#333',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                }}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: isProcessing ? '#141414' : '#3b82f6',
                  color: isProcessing ? '#333' : '#fff',
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