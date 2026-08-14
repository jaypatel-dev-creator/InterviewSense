const DOMAINS = [
  {
    value: 'dsa',
    label: 'DSA',
    description: 'Arrays, trees, graphs, dynamic programming',
  },
  {
    value: 'system_design',
    label: 'System Design',
    description: 'Scalability, databases, caching, distributed systems',
  },
  {
    value: 'backend_engineering',
    label: 'Backend Engineering',
    description: 'APIs, async, queues, error handling',
  },
  {
    value: 'ai_ml',
    label: 'AI / ML',
    description: 'Models, embeddings, RAG, agents, evaluation',
  },
  {
    value: 'ml_system_design',
    label: 'ML System Design',
    description: 'Model serving, feature stores, real-time inference',
  },
]

export default function DomainSelector({ value, onChange }) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
        Domain
      </label>
      <div className="space-y-2">
        {DOMAINS.map((d) => (
          <button
            key={d.value}
            onClick={() => onChange(d.value)}
            className="w-full px-4 py-3 rounded-lg text-left transition-all flex items-center justify-between"
            style={{
              backgroundColor: value === d.value ? 'rgba(59,130,246,0.1)' : '#111118',
              border: `1px solid ${value === d.value ? '#3b82f6' : '#1e1e2e'}`,
            }}
          >
            <div>
              <span
                className="text-sm font-medium block"
                style={{ color: value === d.value ? '#3b82f6' : '#f1f5f9' }}
              >
                {d.label}
              </span>
              <span className="text-xs" style={{ color: '#64748b' }}>
                {d.description}
              </span>
            </div>
            {value === d.value && (
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#3b82f6' }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
