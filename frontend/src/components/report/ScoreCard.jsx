function Score({ label, value, sublabel }) {
  const isNA = value === null || value === undefined
  const pct = isNA ? 0 : Math.min(100, (value / 10) * 100)
  const color = isNA ? '#a8a49e' : value >= 7 ? '#16a34a' : value >= 5 ? '#d97706' : '#dc2626'

  return (
    <div
      className="p-4 space-y-3"
      style={{ backgroundColor: '#ffffff', border: '1px solid #e2e0db' }}
    >
      <div className="space-y-0.5">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#a8a49e' }}>
          {label}
        </span>
        {sublabel && (
          <p className="text-xs" style={{ color: '#d4d2cd' }}>{sublabel}</p>
        )}
      </div>
      {isNA ? (
        <div className="space-y-0.5">
          <span className="text-2xl font-bold" style={{ color: '#d4d2cd', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            N/A
          </span>
          <p className="text-xs" style={{ color: '#a8a49e' }}>
            Voice answers needed
          </p>
        </div>
      ) : (
        <div className="flex items-end gap-1">
          <span
            className="text-4xl font-bold leading-none"
            style={{ color, fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            {value.toFixed(1)}
          </span>
          <span className="text-base mb-0.5" style={{ color: '#a8a49e' }}>/10</span>
        </div>
      )}
      <div className="h-px overflow-hidden" style={{ backgroundColor: '#e2e0db' }}>
        <div
          className="h-full"
          style={{ width: `${pct}%`, backgroundColor: isNA ? '#e2e0db' : color }}
        />
      </div>
    </div>
  )
}

export default function ScoreCard({ report }) {
  const composite = report.composite_score
  const compositeColor =
    composite >= 7 ? '#16a34a' : composite >= 5 ? '#d97706' : '#dc2626'

  const commNA = report.communication_score === null || report.communication_score === undefined
  const pacingNA = report.pacing_score === null || report.pacing_score === undefined

  const compositeLabel = (() => {
    if (!commNA && !pacingNA) return 'Technical 60% · Communication 25% · Pacing 15%'
    if (!commNA) return 'Technical 75% · Communication 25%'
    if (!pacingNA) return 'Technical 85% · Pacing 15%'
    return 'Technical only (no voice answers)'
  })()

  const grade = composite >= 7 ? 'A' : composite >= 5 ? 'B' : 'C'

  return (
    <div className="space-y-4">

      {/* Composite — editorial headline number */}
      <div
        className="p-6"
        style={{ backgroundColor: '#ffffff', border: `1px solid #e2e0db`, borderLeft: `3px solid ${compositeColor}` }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#a8a49e' }}>
              Overall Score
            </p>
            <div className="flex items-end gap-2 mt-2">
              <span
                className="leading-none font-bold"
                style={{ color: compositeColor, fontSize: '72px', fontFamily: "'Bricolage Grotesque', sans-serif", lineHeight: 1 }}
              >
                {composite?.toFixed(1) ?? '—'}
              </span>
              <span className="text-2xl mb-2" style={{ color: '#d4d2cd' }}>/10</span>
            </div>
            <p className="text-xs mt-2" style={{ color: '#a8a49e' }}>
              {compositeLabel}
            </p>
          </div>

          {/* Grade badge */}
          <div
            className="w-16 h-16 flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${compositeColor}0f`,
              border: `1px solid ${compositeColor}30`,
            }}
          >
            <span
              className="text-2xl font-bold"
              style={{ color: compositeColor, fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {grade}
            </span>
          </div>
        </div>
      </div>

      {/* Sub scores */}
      <div className="grid grid-cols-3 gap-3">
        <Score
          label="Technical"
          sublabel="Answer correctness"
          value={report.technical_score}
        />
        <Score
          label="Communication"
          
          sublabel="Energy · pitch · fluency"
          value={report.communication_score}
        />
        <Score
          label="Pacing"
          sublabel="120–160 wpm ideal"
          value={report.pacing_score}
        />
      </div>
    </div>
  )
}