import { useState } from 'react'

export default function JDPaste({ value, onChange }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: expanded ? '#3b82f6' : '#404040' }}
        onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
        onMouseLeave={e => e.currentTarget.style.color = expanded ? '#3b82f6' : '#404040'}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Paste a job description
        <span style={{ color: '#2a2a2a' }}>(optional)</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          <textarea
            rows={6}
            placeholder="Paste the job description here. InterviewSense will extract required skills and generate questions targeting exactly this role..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #1a1a1a',
              color: '#94a3b8',
              outline: 'none',
              lineHeight: '1.7',
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#1a1a1a'}
          />
          {value && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#2a2a2a' }}>
                {value.length} characters
              </span>
              <button
                onClick={() => onChange('')}
                className="text-xs transition-colors"
                style={{ color: '#2a2a2a' }}
                onMouseEnter={e => e.currentTarget.style.color = '#555'}
                onMouseLeave={e => e.currentTarget.style.color = '#2a2a2a'}
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