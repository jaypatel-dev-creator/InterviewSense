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

// Pacing label — Slow / Good / Fast based on WPM thresholds.
// Ideal interview pace: 120–160 wpm. Mirrors _compute_pacing_score on backend.
function PacingBadge({ wpm }) {
  if (!wpm || wpm === 0) return (
    <span className="text-xs font-mono" style={{ color: '#64748b' }}>—</span>
  )

  let label, color
  if (wpm < 100) {
    label = 'Too slow'
    color = '#f59e0b'
  } else if (wpm < 120) {
    label = 'A bit slow'
    color = '#fbbf24'
  } else if (wpm <= 160) {
    label = 'Good pace'
    color = '#22c55e'
  } else if (wpm <= 190) {
    label = 'A bit fast'
    color = '#fbbf24'
  } else {
    label = 'Too fast'
    color = '#ef4444'
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
        {wpm.toFixed(0)} wpm
      </span>
      <span
        className="text-xs font-medium px-1.5 py-0.5 rounded"
        style={{ color, backgroundColor: `${color}18` }}
      >
        {label}
      </span>
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
        {/* Pacing — WPM bar + Slow/Good/Fast label */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#64748b' }}>Pacing</span>
            <PacingBadge wpm={metrics?.wpm ?? 0} />
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: '#1e1e2e' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, ((metrics?.wpm ?? 0) / 220) * 100)}%`,
                backgroundColor: (() => {
                  const wpm = metrics?.wpm ?? 0
                  if (wpm >= 120 && wpm <= 160) return '#22c55e'
                  if (wpm >= 100 && wpm <= 190) return '#fbbf24'
                  return '#ef4444'
                })(),
              }}
            />
          </div>
        </div>

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