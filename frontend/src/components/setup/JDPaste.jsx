import { useState } from 'react'

export default function JDPaste({ value, onChange }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: expanded ? '#3b82f6' : '#64748b' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Paste a job description
        <span style={{ color: '#64748b' }}>(optional — targets questions to the role)</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          <textarea
            rows={6}
            placeholder="Paste the job description here. InterviewSense will extract required skills and generate questions targeting exactly this role..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-sm resize-none transition-colors"
            style={{
              backgroundColor: '#111118',
              border: '1px solid #1e1e2e',
              color: '#f1f5f9',
              outline: 'none',
              lineHeight: '1.6',
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#1e1e2e'}
          />
          {value && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#64748b' }}>
                {value.length} characters
              </span>
              <button
                onClick={() => onChange('')}
                className="text-xs transition-colors"
                style={{ color: '#64748b' }}
                onMouseEnter={e => e.target.style.color = '#fca5a5'}
                onMouseLeave={e => e.target.style.color = '#64748b'}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
