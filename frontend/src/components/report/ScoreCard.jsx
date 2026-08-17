function Score({ label, value, color, sublabel }) {
  const isNA = value === null || value === undefined
  const pct = isNA ? 0 : Math.min(100, (value / 10) * 100)

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
    >
      <div className="space-y-0.5">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>
          {label}
        </span>
        {sublabel && (
          <p className="text-xs" style={{ color: '#475569' }}>{sublabel}</p>
        )}
      </div>
      {isNA ? (
        <div className="space-y-1">
          <span className="text-2xl font-semibold font-mono" style={{ color: '#475569' }}>
            N/A
          </span>
          <p className="text-xs" style={{ color: '#334155' }}>
            Voice answers needed
          </p>
        </div>
      ) : (
        <div className="flex items-end gap-1">
          <span className="text-4xl font-semibold font-mono" style={{ color }}>
            {value.toFixed(1)}
          </span>
          <span className="text-lg mb-1" style={{ color: '#64748b' }}>/10</span>
        </div>
      )}
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1e1e2e' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: isNA ? '#1e1e2e' : color }}
        />
      </div>
    </div>
  )
}

export default function ScoreCard({ report }) {
  const composite = report.composite_score
  const compositeColor =
    composite >= 7 ? '#22c55e' : composite >= 5 ? '#f59e0b' : '#ef4444'

  const commNA = report.communication_score === null || report.communication_score === undefined
  const pacingNA = report.pacing_score === null || report.pacing_score === undefined

  const compositeLabel = (() => {
    if (!commNA && !pacingNA) return 'Technical 60% · Communication 25% · Pacing 15%'
    if (!commNA) return 'Technical 85% · Communication 15%'
    if (!pacingNA) return 'Technical 85% · Pacing 15%'
    return 'Technical only (no voice answers)'
  })()

  return (
    <div className="space-y-4">
      {/* Composite */}
      <div
        className="rounded-xl p-6 flex items-center justify-between"
        style={{
          backgroundColor: '#111118',
          border: `1px solid ${compositeColor}33`,
        }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>
            Overall Score
          </p>
          <div className="flex items-end gap-1 mt-2">
            <span className="text-5xl font-semibold font-mono" style={{ color: compositeColor }}>
              {composite?.toFixed(1) ?? '—'}
            </span>
            <span className="text-xl mb-1" style={{ color: '#64748b' }}>/10</span>
          </div>
          <p className="text-xs mt-2" style={{ color: '#475569' }}>
            {compositeLabel}
          </p>
        </div>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: `${compositeColor}15`,
            border: `2px solid ${compositeColor}40`,
          }}
        >
          <span className="text-2xl font-bold font-mono" style={{ color: compositeColor }}>
            {composite >= 7 ? 'A' : composite >= 5 ? 'B' : 'C'}
          </span>
        </div>
      </div>

      {/* Sub scores */}
      <div className="grid grid-cols-3 gap-3">
        <Score
          label="Technical"
          sublabel="Answer correctness"
          value={report.technical_score}
          color="#3b82f6"
        />
        <Score
          label="Communication"
          sublabel="Vocal energy"
          value={report.communication_score}
          color="#a78bfa"
        />
        <Score
          label="Pacing"
          sublabel="120–160 wpm ideal"
          value={report.pacing_score}
          color="#22c55e"
        />
      </div>
    </div>
  )
}