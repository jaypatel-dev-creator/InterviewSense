const DOMAIN_LABELS = {
  dsa: 'DSA',
  system_design: 'System Design',
  backend_engineering: 'Backend Engineering',
  ai_ml: 'AI / ML',
  ml_system_design: 'ML System Design',
}

export default function SessionCard({ session }) {
  const date = new Date(session.start_time).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const score = session.composite_score
  const scoreColor =
    score == null ? '#64748b'
    : score >= 7 ? '#22c55e'
    : score >= 5 ? '#f59e0b'
    : '#ef4444'

  return (
    <div
      className="rounded-lg px-4 py-3 space-y-2 transition-colors cursor-default"
      style={{ backgroundColor: '#0a0a0f', border: '1px solid #1e1e2e' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#f1f5f9' }}>
          {DOMAIN_LABELS[session.domain] || session.domain}
        </span>
        <span className="text-xs font-mono font-semibold" style={{ color: scoreColor }}>
          {score != null ? `${score.toFixed(1)}/10` : 'In progress'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs capitalize" style={{ color: '#64748b' }}>
          {session.difficulty} · {session.question_count}Q
        </span>
        <span className="text-xs" style={{ color: '#64748b' }}>
          {date}
        </span>
      </div>
      {session.candidate_name && (
        <span className="text-xs" style={{ color: '#64748b' }}>
          {session.candidate_name}
        </span>
      )}
    </div>
  )
} 
