function MetricRow({ label, value, unit = '', max = 100, color = '#3b82f6' }) {
  const pct = Math.min(100, (value / max) * 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
        <span
          className="text-xs font-mono font-medium"
          style={{ color: '#94a3b8' }}
        >
          {typeof value === 'number' ? value.toFixed(1) : '—'}{unit}
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: '#1e1e2e' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function EvaluationBlock({ evaluation }) {
  if (!evaluation) return null

  return (
    <div
      className="rounded-lg p-3 space-y-3"
      style={{ backgroundColor: '#0a0a0f', border: '1px solid #1e1e2e' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
          Last answer
        </span>
        <span
          className="text-sm font-semibold font-mono"
          style={{ color: '#3b82f6' }}
        >
          {evaluation.correctness_score?.toFixed(1)}/10
        </span>
      </div>

      {evaluation.strengths?.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs" style={{ color: '#64748b' }}>Strengths</span>
          {evaluation.strengths.slice(0, 2).map((s, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span style={{ color: '#22c55e', fontSize: '10px', marginTop: '2px' }}>✓</span>
              <span className="text-xs" style={{ color: '#86efac' }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {evaluation.missing_concepts?.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs" style={{ color: '#64748b' }}>Missed</span>
          {evaluation.missing_concepts.slice(0, 2).map((m, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span style={{ color: '#f59e0b', fontSize: '10px', marginTop: '2px' }}>○</span>
              <span className="text-xs" style={{ color: '#fcd34d' }}>{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPanel({ metrics, evaluation }) {
  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
        Speech Analytics
      </h3>

      <div className="space-y-4">
        <MetricRow
          label="Words per minute"
          value={metrics?.wpm ?? 0}
          unit=" wpm"
          max={200}
        />
        <MetricRow
          label="Confidence"
          value={(metrics?.confidence_proxy ?? 0) * 100}
          unit="%"
          max={100}
          color="#22c55e"
        />
        <MetricRow
          label="Energy level"
          value={(metrics?.energy_level ?? 0) * 1000}
          unit=""
          max={100}
          color="#a78bfa"
        />
        <MetricRow
          label="Silence ratio"
          value={(metrics?.silence_ratio ?? 0) * 100}
          unit="%"
          max={100}
          color="#f59e0b"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#64748b' }}>Pauses</span>
          <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
            {metrics?.pause_count ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#64748b' }}>Filler words</span>
          <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
            {metrics?.filler_word_count ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#64748b' }}>Duration</span>
          <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
            {metrics?.answer_duration_seconds
              ? `${metrics.answer_duration_seconds.toFixed(1)}s`
              : '—'}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t" style={{ borderColor: '#1e1e2e' }}>
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: '#64748b' }}
        >
          Evaluation
        </h3>
        <EvaluationBlock evaluation={evaluation} />
        {!evaluation && (
          <p className="text-xs" style={{ color: '#64748b' }}>
            Evaluation appears after your first answer.
          </p>
        )}
      </div>
    </div>
  )
} 
