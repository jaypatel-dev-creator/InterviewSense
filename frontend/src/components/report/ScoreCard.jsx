function Score({ label, value, color }) {
  const pct = Math.min(100, (value / 10) * 100)

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
    >
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>
        {label}
      </span>
      <div className="flex items-end gap-1">
        <span className="text-4xl font-semibold font-mono" style={{ color }}>
          {value?.toFixed(1) ?? '—'}
        </span>
        <span className="text-lg mb-1" style={{ color: '#64748b' }}>/10</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1e1e2e' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function ScoreCard({ report }) {
  const composite = report.composite_score
  const compositeColor =
    composite >= 7 ? '#22c55e' : composite >= 5 ? '#f59e0b' : '#ef4444'

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
        <Score label="Technical" value={report.technical_score} color="#3b82f6" />
        <Score label="Communication" value={report.communication_score} color="#a78bfa" />
        <Score label="Speech" value={report.speech_score} color="#22c55e" />
      </div>
    </div>
  )
}
