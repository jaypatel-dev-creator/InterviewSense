import { useSessionStore } from '../../store/sessionStore'
import { useSession } from '../../hooks/useSession'
import ScoreCard from './ScoreCard'
import QuestionBreakdown from './QuestionBreakdown'
import ImprovementPlan from './ImprovementPlan'

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

export default function ReportScreen() {
  const { report, turns, sessionConfig } = useSessionStore()
  const { resetAndGoHome } = useSession()

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: '#a8a49e' }}>Generating your report...</p>
      </div>
    )
  }

  const endedEarly = turns && sessionConfig &&
    turns.filter(t => !t.skipped).length + (turns.filter(t => t.skipped).length) < sessionConfig.questionCount

  return (
    <div style={{ width: '100%', overflowY: 'auto', flex: 1, backgroundColor: '#f8f7f4' }}>
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
                {turns.length} of {sessionConfig.questionCount} questions answered.
                Unanswered questions are counted as 0 — scores reflect the full session length.
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