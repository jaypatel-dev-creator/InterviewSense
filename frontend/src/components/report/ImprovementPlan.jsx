export default function ImprovementPlan({ plan }) {
  console.log('[ImprovementPlan] received plan:', JSON.stringify(plan?.slice(0, 100)))
  if (!plan || plan.trim().length === 0) return null

  const paragraphs = plan.split('\n').filter((p) => p.trim().length > 0)

  return (
    <div
      className="p-6 space-y-5"
      style={{ backgroundColor: '#ffffff', border: '1px solid #e2e0db' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(200,75,26,0.08)', border: '1px solid rgba(200,75,26,0.2)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c84b1a" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold" style={{ color: '#0f0e0c' }}>
          Improvement Plan
        </h2>
      </div>

      <div className="space-y-3 pl-11">
        {paragraphs.map((p, i) => {
          // Section headers — all caps or ends with colon
          const isHeader = p === p.toUpperCase() || (p.endsWith(':') && p.length < 60)
          return (
            <p
              key={i}
              className="text-sm leading-relaxed"
              style={{
                color: isHeader ? '#0f0e0c' : '#6b6860',
                fontWeight: isHeader ? 600 : 400,
                marginTop: isHeader && i > 0 ? '16px' : undefined,
              }}
            >
              {p}
            </p>
          )
        })}
      </div>
    </div>
  )
}