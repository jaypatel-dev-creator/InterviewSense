import { useState } from 'react'

export default function JDPaste({ value, onChange }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm"
        style={{ color: expanded ? '#c84b1a' : '#6b6860' }}
        onMouseEnter={e => e.currentTarget.style.color = '#0f0e0c'}
        onMouseLeave={e => e.currentTarget.style.color = expanded ? '#c84b1a' : '#6b6860'}
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
        <span style={{ color: '#d4d2cd' }}>(optional)</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          <textarea
            rows={6}
            placeholder="Paste the job description here. InterviewSense will extract required skills and generate questions targeting exactly this role..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 text-sm resize-none"
            style={{
              backgroundColor: '#f8f7f4',
              border: '1px solid #e2e0db',
              color: '#0f0e0c',
              outline: 'none',
              lineHeight: '1.7',
            }}
            onFocus={e => e.target.style.borderColor = '#c84b1a'}
            onBlur={e => e.target.style.borderColor = '#e2e0db'}
          />
          {value && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#d4d2cd' }}>
                {value.length} characters
              </span>
              <button
                onClick={() => onChange('')}
                className="text-xs"
                style={{ color: '#a8a49e' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0f0e0c'}
                onMouseLeave={e => e.currentTarget.style.color = '#a8a49e'}
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