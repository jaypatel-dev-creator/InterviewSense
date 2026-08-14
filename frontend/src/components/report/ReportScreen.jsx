import { useSessionStore } from '../../store/sessionStore'
import { useSession } from '../../hooks/useSession'
import ScoreCard from './ScoreCard'
import QuestionBreakdown from './QuestionBreakdown'
import ImprovementPlan from './ImprovementPlan'
import RadarChart from './RadarChart'

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
    <div className="flex-1 overflow-y-auto px-6 py-10 max-w-4xl mx-auto w-full space-y-10">

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
          {turns.length} questions
        </p>
      </div>

      {/* Score Cards */}
      <ScoreCard report={report} />

      {/* Radar Chart */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
      >
        <h2 className="text-sm font-semibold mb-6" style={{ color: '#94a3b8' }}>
          Topic Performance
        </h2>
        <RadarChart turns={turns} />
      </div>

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
  )
}