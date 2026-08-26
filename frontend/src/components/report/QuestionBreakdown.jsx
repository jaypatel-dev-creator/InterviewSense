export default function QuestionBreakdown({ turns }) {
  if (!turns || turns.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
        Question Breakdown
      </h2>

      <div className="space-y-3">
        {turns.map((turn, i) => {
          // Skipped question — minimal card with badge
          if (turn.skipped) {
            return (
              <div
                key={turn.turn_id || i}
                className="rounded-xl p-5 flex items-center justify-between"
                style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
              >
                <div className="space-y-1">
                  <span className="text-xs font-mono" style={{ color: '#64748b' }}>Q{i + 1}</span>
                  <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                    {turn.question_text}
                  </p>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-md flex-shrink-0 ml-4"
                  style={{ backgroundColor: 'rgba(100,116,139,0.15)', color: '#64748b', border: '1px solid #1e1e2e' }}
                >
                  Skipped
                </span>
              </div>
            )
          }

          const score = turn.correctness_score ?? 0
          const scoreColor =
            score >= 7 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444'

          return (
            <div
              key={turn.turn_id || i}
              className="rounded-xl p-5 space-y-3"
              style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: '#64748b' }}>Q{i + 1}</span>
                    {/* JD skill badge — only shown when this question targeted a JD skill */}
                    {turn.jd_skill_targeted && (
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: 'rgba(59,130,246,0.1)',
                          border: '1px solid rgba(59,130,246,0.3)',
                          color: '#93c5fd',
                        }}
                      >
                        {turn.jd_skill_targeted}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
                    {turn.question_text}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-lg font-semibold font-mono" style={{ color: scoreColor }}>
                    {score.toFixed(1)}
                  </span>
                  <span className="text-xs" style={{ color: '#64748b' }}>/10</span>
                </div>
              </div>

              {turn.answer_transcript && (
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: '#64748b',
                    fontFamily: "'JetBrains Mono', monospace",
                    borderLeft: '2px solid #1e1e2e',
                    paddingLeft: '12px',
                  }}
                >
                  {turn.answer_transcript}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {turn.strengths?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium" style={{ color: '#22c55e' }}>
                      Strengths
                    </span>
                    {turn.strengths.map((s, j) => (
                      <p key={j} className="text-xs" style={{ color: '#86efac' }}>· {s}</p>
                    ))}
                  </div>
                )}
                {turn.missing_concepts?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>
                      Missed
                    </span>
                    {turn.missing_concepts.map((m, j) => (
                      <p key={j} className="text-xs" style={{ color: '#fcd34d' }}>· {m}</p>
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