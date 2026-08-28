import { useState } from 'react'
import { deleteSession } from '../../services/api'

const DOMAIN_LABELS = {
  dsa: 'DSA',
  system_design: 'System Design',
  backend_engineering: 'Backend Engineering',
  ai_ml: 'AI / ML',
  ml_system_design: 'ML System Design',
}

export default function SessionCard({ session, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const date = new Date(session.start_time).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const score = session.composite_score
  const scoreColor =
    score == null ? '#a8a49e'
    : score >= 7 ? '#16a34a'
    : score >= 5 ? '#d97706'
    : '#dc2626'

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setDeleting(true)
    try {
      await deleteSession(session.session_id)
      onDelete(session.session_id)
    } catch (err) {
      console.error('Delete failed:', err)
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div
      className="px-4 py-3 space-y-2 cursor-default"
      style={{ backgroundColor: '#f8f7f4', border: '1px solid #e2e0db' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#c84b1a'}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#e2e0db'
        setConfirming(false)
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#0f0e0c' }}>
          {DOMAIN_LABELS[session.domain] || session.domain}
        </span>
        <span
          className="text-xs font-mono font-semibold"
          style={{ color: scoreColor }}
        >
          {score != null ? `${score.toFixed(1)}/10` : 'Incomplete'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs capitalize" style={{ color: '#a8a49e' }}>
          {session.difficulty} · {session.question_count}Q
        </span>
        <span className="text-xs" style={{ color: '#a8a49e' }}>
          {date}
        </span>
      </div>
      {session.candidate_name && (
        <span className="text-xs" style={{ color: '#6b6860' }}>
          {session.candidate_name}
        </span>
      )}

      {/* Delete button — single click arms it, second click confirms */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-2 py-1"
          style={{
            color: confirming ? '#dc2626' : '#a8a49e',
            border: `1px solid ${confirming ? 'rgba(220,38,38,0.3)' : 'transparent'}`,
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? 'Deleting...' : confirming ? 'Confirm delete' : 'Delete'}
        </button>
      </div>
    </div>
  )
}