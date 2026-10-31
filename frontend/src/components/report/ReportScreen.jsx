import { useState } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { useSession } from '../../hooks/useSession'
import ScoreCard from './ScoreCard'
import QuestionBreakdown from './QuestionBreakdown'
import ImprovementPlan from './ImprovementPlan'

// ─── Scoring Modal ────────────────────────────────────────────────────────────

function ScoringModal({ onClose }) {
  const sections = [
    {
      title: 'Technical Score — 60% of overall',
      color: '#0f0e0c',
      items: [
        {
          label: 'What it measures',
          text: 'Average LLM correctness score across all questions (0–10 per question).',
        },
        {
          label: 'Skipped questions',
          text: 'Skipped questions count as 0 — they are not excluded. Skipping 2 of 5 questions caps your technical score at 6.0 even if you ace the other 3.',
        },
        {
          label: 'Text vs voice',
          text: 'Technical score is not affected by whether you answered via mic or text — only by answer quality.',
        },
      ],
    },
    {
      title: 'Communication Score — 25% of overall',
      color: '#c84b1a',
      items: [
        {
          label: 'What it measures',
          text: 'Fluency — how clearly and smoothly you speak. Computed from Groq Whisper word timestamps. No audio signal processing.',
        },
        {
          label: 'Filler word rate (60% weight)',
          text: 'Hesitation sounds ("um", "uh", "er", "hmm") and the phrases "you know" and "I mean", counted per answer. The score falls from 10 at 0% fillers to 5 at 5% and 0 at 10%. Below 2% is fluent, 5% is noticeable to interviewers, and 10%+ is damaging.',
        },
        {
          label: 'Long pause frequency (40% weight)',
          text: 'Silences longer than 1.5 seconds between words. 0–1 pauses per answer is fine — it can signal thoughtfulness. 4+ pauses suggests the topic caused you to blank, which is a strong signal to study that area. 7+ pauses scores 0.',
        },
        {
          label: 'Text answers',
          text: 'Typed answers are left out of this average, which uses your spoken answers only. If fewer than half of the questions were answered by voice, Communication shows N/A and the overall score uses Technical only.',
        },
      ],
    },
    {
      title: 'Pacing Score — 15% of overall',
      color: '#16a34a',
      items: [
        {
          label: 'What it measures',
          text: 'Words per minute benchmarked against the 120–160 wpm ideal interview range.',
        },
        {
          label: 'Score breakdown',
          text: '120–160 wpm = 10.0 (ideal). Below 120 degrades linearly — under 80 wpm floors at 2.0. Above 160 degrades linearly — above 220 wpm floors at 2.0.',
        },
        {
          label: 'Text answers',
          text: 'Same as Communication: typed answers are left out of the average. If fewer than half of the questions were answered by voice, Pacing shows N/A.',
        },
      ],
    },
    {
      title: 'Overall / Composite Score',
      color: '#6b6860',
      items: [
        {
          label: 'Voice session (half or more of the questions answered by voice)',
          text: 'Technical 60% + Communication 25% + Pacing 15%.',
        },
        {
          label: 'Fewer than half the questions answered by voice',
          text: 'Technical 100%. Communication and Pacing show N/A.',
        },
        {
          label: 'Early session end',
          text: 'Unanswered questions count as 0 toward technical score — the denominator is always the full question count, not the number of answered questions.',
        },
      ],
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,14,12,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e2e0db' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0"
          style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e0db' }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: '#0f0e0c', fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            How am I scored?
          </h2>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5"
            style={{
              color: '#6b6860',
              border: '1px solid #e2e0db',
              backgroundColor: '#f8f7f4',
            }}
          >
            Close
          </button>
        </div>

        {/* Sections */}
        <div className="p-6 space-y-6">
          {sections.map((section, si) => (
            <div key={si} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-0.5" style={{ backgroundColor: section.color }} />
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: section.color }}>
                  {section.title}
                </h3>
              </div>
              <div className="space-y-2 pl-2">
                {section.items.map((item, ii) => (
                  <div key={ii} className="space-y-0.5">
                    <p className="text-xs font-medium" style={{ color: '#0f0e0c' }}>{item.label}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#6b6860' }}>{item.text}</p>
                  </div>
                ))}
              </div>
              {si < sections.length - 1 && (
                <div className="h-px mt-2" style={{ backgroundColor: '#e2e0db' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── JD Coverage ─────────────────────────────────────────────────────────────

function JDCoverage({ jdCoverage }) {
  if (!jdCoverage) return null

  const { tested, not_tested, coverage_pct } = jdCoverage
  const coverageColor =
    coverage_pct >= 75 ? '#16a34a' : coverage_pct >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#a8a49e' }}>
        JD Coverage
      </h2>

      <div
        className="p-5 space-y-4"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e2e0db' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: '#6b6860' }}>
            {tested.length} of {tested.length + not_tested.length} JD skills tested
          </p>
          <span
            className="text-sm font-semibold font-mono"
            style={{ color: coverageColor }}
          >
            {coverage_pct}%
          </span>
        </div>

        <div className="h-px overflow-hidden" style={{ backgroundColor: '#e2e0db' }}>
          <div
            className="h-full"
            style={{ width: `${coverage_pct}%`, backgroundColor: coverageColor }}
          />
        </div>

        {tested.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium" style={{ color: '#16a34a' }}>Tested</span>
            <div className="flex flex-wrap gap-2">
              {tested.map((skill, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1"
                  style={{
                    backgroundColor: 'rgba(22,163,74,0.07)',
                    border: '1px solid rgba(22,163,74,0.25)',
                    color: '#15803d',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {not_tested.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium" style={{ color: '#d97706' }}>Not Tested</span>
            <div className="flex flex-wrap gap-2">
              {not_tested.map((skill, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1"
                  style={{
                    backgroundColor: 'rgba(217,119,6,0.07)',
                    border: '1px solid rgba(217,119,6,0.25)',
                    color: '#b45309',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Report Screen ────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const { report, turns, sessionConfig } = useSessionStore()
  const { resetAndGoHome } = useSession()
  const [showScoringModal, setShowScoringModal] = useState(false)

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: '#a8a49e' }}>Generating your report...</p>
      </div>
    )
  }

  const endedEarly = turns && sessionConfig &&
    turns.filter(t => !t.skipped).length + (turns.filter(t => t.skipped).length) < sessionConfig.questionCount
  const answeredCount = turns ? turns.filter(t => !t.skipped).length : 0

  return (
    <div style={{ width: '100%', overflowY: 'auto', flex: 1, backgroundColor: '#f8f7f4' }}>
      {showScoringModal && <ScoringModal onClose={() => setShowScoringModal(false)} />}

      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1.5rem' }} className="space-y-10">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: '#0f0e0c', fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Interview Complete
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScoringModal(true)}
                className="text-xs px-3 py-2"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e0db',
                  color: '#6b6860',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#c84b1a'
                  e.currentTarget.style.color = '#c84b1a'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e0db'
                  e.currentTarget.style.color = '#6b6860'
                }}
              >
                How am I scored?
              </button>
              <button
                onClick={resetAndGoHome}
                className="text-sm px-4 py-2"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e0db',
                  color: '#6b6860',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#c84b1a'
                  e.currentTarget.style.color = '#c84b1a'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e0db'
                  e.currentTarget.style.color = '#6b6860'
                }}
              >
                Start New Interview
              </button>
            </div>
          </div>
          <p style={{ color: '#a8a49e', fontSize: '13px' }}>
            {sessionConfig?.domain?.replace('_', ' ')} · {sessionConfig?.difficulty} ·{' '}
            {sessionConfig?.questionCount ?? '—'} questions
          </p>
        </div>

        {/* Early end banner */}
        {endedEarly && (
          <div
            className="px-5 py-4 flex items-start gap-3"
            style={{ backgroundColor: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}
          >
            <span style={{ color: '#d97706', fontSize: '16px', marginTop: '1px' }}>⚠</span>
            <div className="space-y-1">
              <p className="text-sm font-medium" style={{ color: '#b45309' }}>
                Session ended early
              </p>
              <p className="text-xs" style={{ color: '#6b6860' }}>
                {answeredCount} of {sessionConfig.questionCount} questions answered.
                Unanswered questions count as 0 in the Technical score, so Technical and Overall
                reflect the full session length. Communication and Pacing are scored only if at
                least {Math.ceil(sessionConfig.questionCount / 2)} of the {sessionConfig.questionCount} questions
                were answered by voice.
              </p>
            </div>
          </div>
        )}

        {/* Score Cards */}
        <ScoreCard report={report} />

        {/* JD Coverage — only rendered when JD was provided */}
        <JDCoverage jdCoverage={report.jd_coverage} />

        {/* Improvement Plan */}
        <ImprovementPlan plan={report.improvement_plan_text} />

        {/* Question Breakdown */}
        <QuestionBreakdown turns={turns} />

        {/* LangSmith Trace */}
        {report.langsmith_trace_url && (
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ backgroundColor: '#ffffff', border: '1px solid #e2e0db' }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: '#0f0e0c' }}>
                LangSmith Trace
              </p>
              <p className="text-xs" style={{ color: '#a8a49e' }}>
                Full agent execution trace for this session
              </p>
            </div>
            <a
              href={report.langsmith_trace_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-2"
              style={{
                backgroundColor: 'rgba(200,75,26,0.07)',
                border: '1px solid rgba(200,75,26,0.25)',
                color: '#c84b1a',
              }}
            >
              View Trace
            </a>
          </div>
        )}

      </div>
    </div>
  )
}