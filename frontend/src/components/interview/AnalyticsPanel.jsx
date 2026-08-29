function MetricRow({ label, value, unit = '', max = 100, color = '#c84b1a' }) {
  const pct = Math.min(100, (value / max) * 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: '#6b6860' }}>{label}</span>
        <span
          className="text-xs font-mono font-medium"
          style={{ color: '#0f0e0c' }}
        >
          {typeof value === 'number' ? value.toFixed(1) : '—'}{unit}
        </span>
      </div>
      <div
        className="h-px overflow-hidden"
        style={{ backgroundColor: '#e2e0db' }}
      >
        <div
          className="h-full"
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
    <span className="text-xs font-mono" style={{ color: '#a8a49e' }}>—</span>
  )

  let label, color
  if (wpm < 100) {
    label = 'Too slow'
    color = '#d97706'
  } else if (wpm < 120) {
    label = 'A bit slow'
    color = '#d97706'
  } else if (wpm <= 160) {
    label = 'Good pace'
    color = '#16a34a'
  } else if (wpm <= 190) {
    label = 'A bit fast'
    color = '#d97706'
  } else {
    label = 'Too fast'
    color = '#dc2626'
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono" style={{ color: '#0f0e0c' }}>
        {wpm.toFixed(0)} wpm
      </span>
      <span
        className="text-xs font-medium px-1.5 py-0.5"
        style={{ color, backgroundColor: `${color}14`, border: `1px solid ${color}30` }}
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
      className="p-3 space-y-3"
      style={{ backgroundColor: '#f8f7f4', border: '1px solid #e2e0db' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#6b6860' }}>
          Last answer
        </span>
        <span
          className="text-sm font-semibold font-mono"
          style={{ color: '#c84b1a' }}
        >
          {evaluation.correctness_score?.toFixed(1)}/10
        </span>
      </div>

      {evaluation.strengths?.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs" style={{ color: '#a8a49e' }}>Strengths</span>
          {evaluation.strengths.slice(0, 2).map((s, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span style={{ color: '#16a34a', fontSize: '10px', marginTop: '2px' }}>✓</span>
              <span className="text-xs" style={{ color: '#16a34a' }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {evaluation.missing_concepts?.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs" style={{ color: '#a8a49e' }}>Missed</span>
          {evaluation.missing_concepts.slice(0, 2).map((m, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span style={{ color: '#d97706', fontSize: '10px', marginTop: '2px' }}>○</span>
              <span className="text-xs" style={{ color: '#d97706' }}>{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPanel({ metrics, evaluation }) {
  // Filler rate — filler_word_count as % of total words, for bar display.
  // Mirrors backend formula: 0% = clean, 5% = noticeable, 10%+ = damaging.
  const wpm = metrics?.wpm ?? 0
  const duration = metrics?.answer_duration_seconds ?? 0
  const totalWords = wpm > 0 && duration > 0 ? Math.max(1, Math.round((wpm / 60) * duration)) : 1
  const fillerCount = metrics?.filler_word_count ?? 0
  const fillerRatePct = Math.min(100, (fillerCount / totalWords) * 100)
  const fillerColor = fillerRatePct <= 2 ? '#16a34a' : fillerRatePct <= 5 ? '#d97706' : '#dc2626'

  // Pause bar — max meaningful display at 7 pauses (maps to score 0 on backend).
  const pauseCount = metrics?.pause_count ?? 0
  const pauseBarPct = Math.min(100, (pauseCount / 7) * 100)
  const pauseColor = pauseCount <= 1 ? '#16a34a' : pauseCount <= 3 ? '#d97706' : '#dc2626'

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#a8a49e' }}>
        Speech Analytics
      </h3>

      <div className="space-y-4">
        {/* Pacing — WPM bar + Slow/Good/Fast label */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#6b6860' }}>Pacing</span>
            <PacingBadge wpm={wpm} />
          </div>
          <div
            className="h-px overflow-hidden"
            style={{ backgroundColor: '#e2e0db' }}
          >
            <div
              className="h-full"
              style={{
                width: `${Math.min(100, (wpm / 220) * 100)}%`,
                backgroundColor: (() => {
                  if (wpm >= 120 && wpm <= 160) return '#16a34a'
                  if (wpm >= 100 && wpm <= 190) return '#d97706'
                  return '#dc2626'
                })(),
              }}
            />
          </div>
        </div>

        {/* Filler rate — replaces energy_level. Bar fills as filler rate rises. */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#6b6860' }}>Filler rate</span>
            <span className="text-xs font-mono font-medium" style={{ color: '#0f0e0c' }}>
              {fillerCount > 0 ? `${fillerRatePct.toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="h-px overflow-hidden" style={{ backgroundColor: '#e2e0db' }}>
            <div className="h-full" style={{ width: `${fillerRatePct}%`, backgroundColor: fillerColor }} />
          </div>
        </div>

        {/* Pause bar — replaces pitch_variation. Bar fills as pause count rises. */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#6b6860' }}>Long pauses</span>
            <span className="text-xs font-mono font-medium" style={{ color: '#0f0e0c' }}>
              {pauseCount > 0 ? pauseCount : '—'}
            </span>
          </div>
          <div className="h-px overflow-hidden" style={{ backgroundColor: '#e2e0db' }}>
            <div className="h-full" style={{ width: `${pauseBarPct}%`, backgroundColor: pauseColor }} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#6b6860' }}>Filler words</span>
          <span className="text-xs font-mono" style={{ color: '#0f0e0c' }}>
            {metrics?.filler_word_count ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#6b6860' }}>Pauses</span>
          <span className="text-xs font-mono" style={{ color: '#0f0e0c' }}>
            {metrics?.pause_count ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#6b6860' }}>Duration</span>
          <span className="text-xs font-mono" style={{ color: '#0f0e0c' }}>
            {metrics?.answer_duration_seconds
              ? `${metrics.answer_duration_seconds.toFixed(1)}s`
              : '—'}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t" style={{ borderColor: '#e2e0db' }}>
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: '#a8a49e' }}
        >
          Evaluation
        </h3>
        <EvaluationBlock evaluation={evaluation} />
        {!evaluation && (
          <p className="text-xs" style={{ color: '#a8a49e' }}>
            Evaluation appears after your first answer.
          </p>
        )}
      </div>
    </div>
  )
}