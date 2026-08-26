import { useSessionStore } from '../../store/sessionStore'
import { useSession } from '../../hooks/useSession'
import ScoreCard from './ScoreCard'
import QuestionBreakdown from './QuestionBreakdown'
import ImprovementPlan from './ImprovementPlan'

function JDCoverage({ jdCoverage }) {
  if (!jdCoverage) return null

  const { tested, not_tested, coverage_pct } = jdCoverage
  const coverageColor =
    coverage_pct >= 75 ? '#22c55e' : coverage_pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
        JD Coverage
      </h2>

      <div
        className="rounded-xl p-5 space-y-4"
        style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
      >
        {/* Coverage percentage */}
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            {tested.length} of {tested.length + not_tested.length} JD skills tested
          </p>
          <span className="text-sm font-semibold font-mono" style={{ color: coverageColor }}>
            {coverage_pct}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1e1e2e' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${coverage_pct}%`, backgroundColor: coverageColor }}
          />
        </div>

        {/* Tested skills */}
        {tested.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Tested</span>
            <div className="flex flex-wrap gap-2">
              {tested.map((skill, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#86efac',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Not tested skills */}
        {not_tested.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>Not Tested</span>
            <div className="flex flex-wrap gap-2">
              {not_tested.map((skill, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fcd34d',
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
        <p style={{ color: '#64748b' }}>Generating your report...</p>
      </div>
    )
  }

  return (
    <div style={{ width: "100%", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "2.5rem 1.5rem" }} className="space-y-10">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold" style={{ color: '#f1f5f9' }}>
              Interview Complete
            </h1>
            <button
              onClick={resetAndGoHome}
              className="text-sm px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#111118',
                border: '1px solid #1e1e2e',
                color: '#64748b',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.color = '#3b82f6'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e1e2e'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              Start New Interview
            </button>
          </div>
          <p style={{ color: '#64748b' }}>
            {sessionConfig?.domain?.replace('_', ' ')} · {sessionConfig?.difficulty} ·{' '}
            {sessionConfig?.questionCount ?? '—'} questions
          </p>
        </div>

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
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                LangSmith Trace
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                Full agent execution trace for this session
              </p>
            </div>
            <a
              href={report.langsmith_trace_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'rgba(59,130,246,0.1)',
                border: '1px solid #3b82f6',
                color: '#3b82f6',
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