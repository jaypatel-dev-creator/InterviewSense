import { useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { useUIStore } from '../../store/uiStore'
import DomainSelector from './DomainSelector'
import JDPaste from './JDPaste'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const QUESTION_COUNTS = [5, 8, 10]

const DIFFICULTY_DESC = {
  easy: 'Foundational concepts, definitions, basic examples',
  medium: 'Applied understanding, tradeoffs, reasoning',
  hard: 'Advanced tradeoffs, edge cases, system-level thinking',
}

export default function SetupForm() {
  const { startSession } = useSession()
  const { isProcessing } = useUIStore()

  const [form, setForm] = useState({
    candidateName: '',
    domain: 'dsa',
    difficulty: 'medium',
    questionCount: 5,
    jdText: '',
  })

  const handleSubmit = async () => {
    await startSession(form)
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: '#f1f5f9' }}
          >
            Ready to practice?
          </h1>
          <p style={{ color: '#64748b' }}>
            Set up your session and InterviewSense will adapt to how you speak and what you know.
          </p>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
            Your name <span style={{ color: '#64748b' }}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder="Jay"
            value={form.candidateName}
            onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
            className="w-full px-4 py-3 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: '#111118',
              border: '1px solid #1e1e2e',
              color: '#f1f5f9',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#1e1e2e'}
          />
        </div>

        {/* Domain */}
        <DomainSelector
          value={form.domain}
          onChange={(domain) => setForm({ ...form, domain })}
        />

        {/* Difficulty */}
        <div className="space-y-3">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
            Difficulty
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setForm({ ...form, difficulty: d })}
                className="px-4 py-3 rounded-lg text-sm font-medium transition-all capitalize"
                style={{
                  backgroundColor: form.difficulty === d ? 'rgba(59,130,246,0.15)' : '#111118',
                  border: `1px solid ${form.difficulty === d ? '#3b82f6' : '#1e1e2e'}`,
                  color: form.difficulty === d ? '#3b82f6' : '#64748b',
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: '#64748b' }}>
            {DIFFICULTY_DESC[form.difficulty]}
          </p>
        </div>

        {/* Question Count */}
        <div className="space-y-3">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
            Questions
          </label>
          <div className="flex gap-2">
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => setForm({ ...form, questionCount: n })}
                className="px-5 py-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: form.questionCount === n ? 'rgba(59,130,246,0.15)' : '#111118',
                  border: `1px solid ${form.questionCount === n ? '#3b82f6' : '#1e1e2e'}`,
                  color: form.questionCount === n ? '#3b82f6' : '#64748b',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* JD Paste */}
        <JDPaste
          value={form.jdText}
          onChange={(jdText) => setForm({ ...form, jdText })}
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isProcessing}
          className="w-full py-4 rounded-lg font-semibold text-sm transition-all"
          style={{
            backgroundColor: isProcessing ? '#1e1e2e' : '#3b82f6',
            color: isProcessing ? '#64748b' : '#ffffff',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
          }}
        >
          {isProcessing ? 'Starting session...' : 'Start Interview'}
        </button>

      </div>
    </div>
  )
}