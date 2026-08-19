export default function ImprovementPlan({ plan }) {
  if (!plan || plan.trim().length === 0) return null

  const paragraphs = plan.split('\n').filter((p) => p.trim().length > 0)

  return (
    <div
      className="rounded-xl p-6 space-y-4"
      style={{ backgroundColor: '#111118', border: '1px solid #1e1e2e' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
          Improvement Plan
        </h2>
      </div>

      <div className="space-y-3 pl-11">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-sm leading-relaxed"
            style={{ color: '#94a3b8' }}
          >
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}w