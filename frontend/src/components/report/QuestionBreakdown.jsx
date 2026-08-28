export default function QuestionBreakdown({ turns }) {
  if (!turns || turns.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#a8a49e' }}>
        Question Breakdown
      </h2>

      <div className="space-y-3">
        {turns.map((turn, i) => {
          // Skipped question — minimal card with badge
          if (turn.skipped) {
            return (
              <div
                key={turn.turn_id || i}
                className="p-5 flex items-center justify-between"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e0db' }}
              >
                <div className="space-y-1">
                  <span className="text-xs font-mono" style={{ color: '#a8a49e' }}>Q{i + 1}</span>
                  <p className="text-sm font-medium" style={{ color: '#0f0e0c' }}>
                    {turn.question_text}
                  </p>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 flex-shrink-0 ml-4"
                  style={{ backgroundColor: '#f8f7f4', color: '#a8a49e', border: '1px solid #e2e0db' }}
                >
                  Skipped
                </span>
              </div>
            )
          }

          const score = turn.correctness_score ?? 0
          const scoreColor =
            score >= 7 ? '#16a34a' : score >= 5 ? '#d97706' : '#dc2626'

          return (
            <div
              key={turn.turn_id || i}
              className="p-5 space-y-4"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e2e0db', borderLeft: `3px solid ${scoreColor}` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: '#a8a49e' }}>Q{i + 1}</span>
                    {/* JD skill badge — only shown when this question targeted a JD skill */}
                    {turn.jd_skill_targeted && (
                      <span
                        className="text-xs px-2 py-0.5"
                        style={{
                          backgroundColor: 'rgba(200,75,26,0.07)',
                          border: '1px solid rgba(200,75,26,0.25)',
                          color: '#c84b1a',
                        }}
                      >
                        {turn.jd_skill_targeted}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#0f0e0c' }}>
                    {turn.question_text}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span
                    className="text-2xl font-bold leading-none"
                    style={{ color: scoreColor, fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    {score.toFixed(1)}
                  </span>
                  <span className="text-xs" style={{ color: '#a8a49e' }}>/10</span>
                </div>
              </div>

              {turn.answer_transcript && (
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: '#6b6860',
                    fontFamily: "'JetBrains Mono', monospace",
                    borderLeft: '2px solid #e2e0db',
                    paddingLeft: '12px',
                  }}
                >
                  {turn.answer_transcript}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                {turn.strengths?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: '#16a34a' }}>
                      Strengths
                    </span>
                    {turn.strengths.map((s, j) => (
                      <p key={j} className="text-xs" style={{ color: '#15803d' }}>· {s}</p>
                    ))}
                  </div>
                )}
                {turn.missing_concepts?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: '#d97706' }}>
                      Missed
                    </span>
                    {turn.missing_concepts.map((m, j) => (
                      <p key={j} className="text-xs" style={{ color: '#b45309' }}>· {m}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}