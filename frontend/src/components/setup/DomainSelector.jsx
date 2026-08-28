const DOMAINS = [
  {
    value: 'dsa',
    label: 'DSA',
    description: 'Arrays, trees, graphs, dynamic programming',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <line x1="12" y1="7" x2="5" y2="17" />
        <line x1="12" y1="7" x2="19" y2="17" />
      </svg>
    ),
  },
  {
    value: 'system_design',
    label: 'System Design',
    description: 'Scalability, databases, caching, distributed systems',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="5" rx="1" />
        <rect x="2" y="11" width="20" height="5" rx="1" />
        <rect x="2" y="19" width="20" height="2" rx="1" />
        <circle cx="6" cy="5.5" r="0.8" fill="currentColor" />
        <circle cx="6" cy="13.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: 'backend_engineering',
    label: 'Backend Engineering',
    description: 'APIs, async, queues, error handling',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="12" y1="2" x2="12" y2="22" opacity="0.4" />
      </svg>
    ),
  },
  {
    value: 'ai_ml',
    label: 'AI / ML',
    description: 'Models, embeddings, RAG, agents, evaluation',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V6a4 4 0 0 1 4-4z" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    value: 'ml_system_design',
    label: 'ML System Design',
    description: 'Model serving, feature stores, real-time inference',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <line x1="10" y1="6.5" x2="14" y2="6.5" />
        <line x1="10" y1="17.5" x2="14" y2="17.5" />
        <line x1="6.5" y1="10" x2="6.5" y2="14" />
        <line x1="17.5" y1="10" x2="17.5" y2="14" />
      </svg>
    ),
  },
]

export default function DomainSelector({ value, onChange }) {
  return (
    <div className="space-y-3">
      <label
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: '#a8a49e' }}
      >
        Domain
      </label>
      <div className="space-y-2">
        {DOMAINS.map((d) => {
          const selected = value === d.value
          return (
            <button
              key={d.value}
              onClick={() => onChange(d.value)}
              className="w-full px-4 py-3.5 text-left flex items-center gap-4"
              style={{
                backgroundColor: selected ? 'rgba(200,75,26,0.05)' : '#f8f7f4',
                border: `1px solid ${selected ? '#c84b1a' : '#e2e0db'}`,
              }}
              onMouseEnter={e => {
                if (!selected) e.currentTarget.style.borderColor = '#0f0e0c'
              }}
              onMouseLeave={e => {
                if (!selected) e.currentTarget.style.borderColor = '#e2e0db'
              }}
            >
              {/* Icon */}
              <div
                className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: selected ? 'rgba(200,75,26,0.1)' : '#ffffff',
                  color: selected ? '#c84b1a' : '#a8a49e',
                  border: `1px solid ${selected ? 'rgba(200,75,26,0.3)' : '#e2e0db'}`,
                }}
              >
                {d.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <span
                  className="text-sm font-medium block"
                  style={{ color: selected ? '#c84b1a' : '#0f0e0c' }}
                >
                  {d.label}
                </span>
                <span className="text-xs" style={{ color: '#a8a49e' }}>
                  {d.description}
                </span>
              </div>

              {/* Selected indicator */}
              {selected && (
                <div
                  className="w-1.5 h-1.5 flex-shrink-0"
                  style={{ backgroundColor: '#c84b1a' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}